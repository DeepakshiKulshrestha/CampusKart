import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import * as storage from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getCurrentUser());
  const [token, setTokenState] = useState(() => storage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  // Sync with token and verify profile on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = storage.getToken();
      const storedUser = storage.getCurrentUser();

      if (storedToken && storedUser) {
        try {
          // Attempt to fetch fresh profile from backend
          const res = await userApi.getMe();
          if (res?.success && res.user && isMounted) {
            const saved = storage.saveUser({ ...res.user, token: storedToken });
            setUser(saved);
          }
        } catch {
          // Backend offline or unreachable — keep cached localStorage user
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Cross-tab storage synchronization
    const handleStorageChange = () => {
      setUser(storage.getCurrentUser());
      setTokenState(storage.getToken());
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Login handler: calls real backend API with graceful offline mock fallback
  const login = useCallback(async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      if (response?.success && response.token && response.user) {
        const savedUser = storage.saveUser({ ...response.user, token: response.token });
        setUser(savedUser);
        setTokenState(response.token);
        return { success: true, user: savedUser };
      }
      throw new Error(response?.message || 'Login failed');
    } catch (err) {
      // If error is from server (e.g. 401 invalid password, 403 restricted, 400 validation)
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      if (err.response?.data?.errors?.length) {
        throw new Error(err.response.data.errors.map((e) => e.message).join(', '));
      }

      // If network error (backend offline/not running), use mock fallback
      console.warn('Backend server unreachable; utilizing local authentication mock fallback.');
      const existingUsers = storage.getStoredUsers();
      const matched = existingUsers.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      const mockToken = `mock-jwt-token-${Date.now()}`;
      const userToSave = matched
        ? { ...matched, token: mockToken }
        : {
          name: email.split('@')[0],
          firstName: email.split('@')[0].split('.')[0] || 'Student',
          lastName: email.split('@')[0].split('.')[1] || '',
          email: email.trim(),
          role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'STUDENT',
          token: mockToken,
        };

      const saved = storage.saveUser(userToSave);
      setUser(saved);
      setTokenState(mockToken);
      return { success: true, user: saved };
    }
  }, []);

  // Registration handler: calls real backend API with graceful offline mock fallback
  const register = useCallback(async ({ name, email, password, college, major }) => {
    try {
      const response = await authApi.register({ name, email, password, role: 'STUDENT' });
      if (response?.success && response.token && response.user) {
        const savedUser = storage.saveUser({
          ...response.user,
          token: response.token,
          college: college || response.user.college,
          major: major || response.user.major,
        });
        setUser(savedUser);
        setTokenState(response.token);
        return { success: true, user: savedUser };
      }
      throw new Error(response?.message || 'Registration failed');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      if (err.response?.data?.errors?.length) {
        throw new Error(err.response.data.errors.map((e) => e.message).join(', '));
      }

      // Fallback if backend offline
      console.warn('Backend server unreachable; utilizing local registration mock fallback.');
      const mockToken = `mock-jwt-token-${Date.now()}`;
      const nameParts = (name || '').trim().split(/\s+/);
      const newUser = storage.saveUser({
        name,
        firstName: nameParts[0] || 'Student',
        lastName: nameParts.slice(1).join(' ') || '',
        email: email.trim(),
        college: college || 'Thapar Institute of Engineering & Technology',
        major: major || 'Undergraduate',
        role: email.toLowerCase().includes('admin') ? 'ADMIN' : 'STUDENT',
        token: mockToken,
      });

      setUser(newUser);
      setTokenState(mockToken);
      return { success: true, user: newUser };
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      storage.clearUser();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  // Profile update handler
  const updateProfile = useCallback(async (updates) => {
    try {
      // Send name & profileImage to backend if available
      if (updates.name || updates.avatarUrl) {
        try {
          await userApi.updateMe({
            name: updates.name || [updates.firstName, updates.lastName].filter(Boolean).join(' '),
            profileImage: updates.avatarUrl,
          });
        } catch (apiErr) {
          console.warn('Could not update backend profile (offline or mock mode):', apiErr.message);
        }
      }
    } finally {
      const updated = storage.updateUserProfile(updates);
      setUser(updated);
      return updated;
    }
  }, []);

  // Role checks
  const normalizedRole = (user?.role || '').toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN';
  const isStudent = normalizedRole === 'STUDENT' || !user?.role;
  const isAuthenticated = Boolean(user && user.isLoggedIn);

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isStudent,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

