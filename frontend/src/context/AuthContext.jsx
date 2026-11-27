import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, userApi, getErrorMessage } from '../services/api';
import * as storage from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getCurrentUser());
  const [token, setTokenState] = useState(() => storage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  // On load, refresh the cached profile from the backend (role and restriction may have changed)
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (storage.getToken() && storage.getCurrentUser()) {
        try {
          const res = await userApi.getMe();
          if (res?.success && res.user && isMounted) {
            setUser(storage.saveUser({ ...res.user, token: storage.getToken() }));
          }
        } catch (err) {
          // 401 (expired token) or 403 (restricted account): log out. Network errors keep the cached session.
          if ([401, 403].includes(err.response?.status) && isMounted) {
            storage.clearUser();
            setUser(null);
            setTokenState(null);
          }
        }
      }
      if (isMounted) setIsLoading(false);
    }

    initAuth();

    // Cross-tab sync, and forced logout when any request gets a 401 (see services/api.js)
    const syncFromStorage = () => {
      setUser(storage.getCurrentUser());
      setTokenState(storage.getToken());
    };
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('campuskart_logged_out', syncFromStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('campuskart_logged_out', syncFromStorage);
    };
  }, []);

  const startSession = (response) => {
    const savedUser = storage.saveUser({ ...response.user, token: response.token });
    setUser(savedUser);
    setTokenState(response.token);
    return { success: true, user: savedUser };
  };

  // Login: errors (wrong password, restricted, server down) are shown to the user, never faked
  const login = useCallback(async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      return startSession(response);
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Login failed'));
    }
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    try {
      const response = await authApi.register({ name, email, password });
      return startSession(response);
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Registration failed'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      storage.clearUser();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  // Saves name/profileImage on the backend first; extra profile fields (phone, bio...) stay on this device
  const updateProfile = useCallback(async (updates) => {
    const payload = {};
    const name = updates.name || [updates.firstName, updates.lastName].filter(Boolean).join(' ');
    if (name) payload.name = name;
    if (updates.profileImage !== undefined) payload.profileImage = updates.profileImage;

    let serverUser = null;
    if (Object.keys(payload).length) {
      try {
        serverUser = (await userApi.updateMe(payload)).user;
      } catch (err) {
        throw new Error(getErrorMessage(err, 'Could not update your profile'));
      }
    }
    const updated = storage.updateUserProfile({
      ...updates,
      ...(serverUser ? { name: serverUser.name, avatarUrl: serverUser.profileImage || updates.avatarUrl || storage.getCurrentUser()?.avatarUrl } : {}),
    });
    setUser(updated);
    return updated;
  }, []);

  const normalizedRole = (user?.role || '').toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN';
  const isStudent = normalizedRole === 'STUDENT';
  const isAuthenticated = Boolean(user && user.isLoggedIn && token);

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
