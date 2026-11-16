import axios from 'axios';
import * as storage from './storage';
import {
  sanitizeProduct,
  resolveImageUrl,
  getProductImageUrl,
  getProductImages,
} from '../utils/imageUrl';

// Base Axios instance matching backend configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 token expiration gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid or expired
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthEndpoint) {
        storage.removeToken();
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API methods
export const authApi = {
  // POST /api/auth/login -> { success: true, token, user }
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // POST /api/auth/register -> { success: true, token, user }
  register: async ({ name, email, password, role = 'STUDENT' }) => {
    const response = await api.post('/auth/register', { name, email, password, role });
    return response.data;
  },

  // POST /api/auth/logout -> { success: true, message }
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch {
      // Logout should succeed locally even if server is unreachable
      return { success: true };
    }
  },
};

// User Profile API methods
export const userApi = {
  // GET /api/users/me (protected) -> { success: true, user }
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // PUT /api/users/me (protected) -> { success: true, user }
  updateMe: async ({ name, profileImage }) => {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (profileImage !== undefined) payload.profileImage = profileImage;
    const response = await api.put('/users/me', payload);
    return response.data;
  },
};

// Product API methods (including backend multipart/form-data upload & fallback)
export const productApi = {
  // GET /api/products
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      if (response.data?.items) {
        return {
          ...response.data,
          items: response.data.items.map(sanitizeProduct),
        };
      }
      return response.data;
    } catch {
      return { success: true, items: storage.getStoredProducts() };
    }
  },

  // GET /api/products/:id
  getProductById: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      if (response.data?.product) {
        return {
          ...response.data,
          product: sanitizeProduct(response.data.product),
        };
      }
      return response.data;
    } catch {
      const local = storage.getProductById(id);
      return { success: Boolean(local), product: local };
    }
  },

  // POST /api/products (protected, multipart/form-data, images in field "images")
  createProduct: async (formData, fallbackData = {}) => {
    try {
      // Allow browser/Axios to set multipart boundary automatically
      const response = await api.post('/products', formData);
      if (response.data?.success && response.data?.product) {
        const sanitized = sanitizeProduct(response.data.product);
        storage.addProduct(sanitized);
        return { ...response.data, product: sanitized };
      }
      return response.data;
    } catch (err) {
      console.warn('Backend /api/products offline or returned error; utilizing persistent storage fallback:', err.message);
      // Convert File objects to persistent Base64 Data URLs so images render and persist across page loads
      let imageUrls = [];
      const rawCandidates = fallbackData.files || fallbackData.images || [];
      const filesToConvert = [];
      const stringUrls = [];

      if (Array.isArray(rawCandidates)) {
        for (const item of rawCandidates) {
          if (typeof File !== 'undefined' && item instanceof File) {
            filesToConvert.push(item);
          } else {
            const resolved = resolveImageUrl(item);
            if (resolved) stringUrls.push(resolved);
          }
        }
      }

      if (filesToConvert.length > 0) {
        const converted = await storage.filesToDataUrls(filesToConvert);
        imageUrls = [...stringUrls, ...converted];
      } else {
        imageUrls = stringUrls;
      }

      if (imageUrls.length === 0 && fallbackData.image) {
        const resolvedDirect = resolveImageUrl(fallbackData.image);
        if (resolvedDirect) imageUrls.push(resolvedDirect);
      }

      const saved = storage.addProduct({
        ...fallbackData,
        images: imageUrls,
        image: imageUrls[0] || '',
      });
      return { success: true, product: saved, isLocalFallback: true };
    }
  },

  // PUT /api/products/:id (protected, owner only)
  updateProduct: async (id, data, fallbackFiles = null) => {
    try {
      const response = await api.put(`/products/${id}`, data);
      if (response.data?.success && response.data?.product) {
        const sanitized = sanitizeProduct(response.data.product);
        storage.updateProduct(id, sanitized);
        return { ...response.data, product: sanitized };
      }
      return response.data;
    } catch (err) {
      console.warn('Backend update product offline; using local storage fallback:', err.message);
      let updates = { ...data };
      if (fallbackFiles && fallbackFiles.length > 0) {
        const newDataUrls = await storage.filesToDataUrls(fallbackFiles);
        updates.images = [...(data.existingImages || []), ...newDataUrls];
        updates.image = updates.images[0];
      }
      const updated = storage.updateProduct(id, updates);
      return { success: true, product: updated, isLocalFallback: true };
    }
  },

  // PUT /api/products/:id/sold (protected)
  markSold: async (id) => {
    try {
      const response = await api.put(`/products/${id}/sold`);
      return response.data;
    } catch {
      return { success: true, product: storage.updateProduct(id, { status: 'SOLD' }) };
    }
  },
};

// Interest API methods
export const interestApi = {
  createInterest: async (params) => {
    return storage.createInterest(params);
  },
  getSellerInterests: async (sellerId, sellerEmail) => {
    return storage.getInterestsBySeller(sellerId, sellerEmail);
  },
  getBuyerInterests: async (buyerId, buyerEmail) => {
    return storage.getInterestsByBuyer(buyerId, buyerEmail);
  },
  updateStatus: async (interestId, status) => {
    return storage.updateInterestStatus(interestId, status);
  },
  checkExisting: (productId, buyerId, buyerEmail) => {
    return storage.getInterestByProductAndBuyer(productId, buyerId, buyerEmail);
  },
};

// Transaction API methods
export const transactionApi = {
  createTransaction: async (data) => {
    const txn = storage.createTransaction(data);
    // Attempt backend markSold as well
    if (data.productId) {
      productApi.markSold(data.productId).catch(() => {});
    }
    return txn;
  },
  getBuyerTransactions: async (buyerId, buyerEmail) => {
    return storage.getTransactionsByBuyer(buyerId, buyerEmail);
  },
  getSellerTransactions: async (sellerId, sellerEmail) => {
    return storage.getTransactionsBySeller(sellerId, sellerEmail);
  },
  getTransactionById: async (id) => {
    return storage.getTransactionById(id);
  },
};

// Student-to-Student Chat & Negotiation API methods
export const chatApi = {
  getConversations: async (userId, userEmail) => {
    return storage.getConversationsByUser(userId, userEmail);
  },
  getConversationById: async (id) => {
    return storage.getConversationById(id);
  },
  getOrCreateConversation: async (params) => {
    return storage.getOrCreateConversation(params);
  },
  sendMessage: async (params) => {
    return storage.sendMessage(params);
  },
  sendOffer: async (params) => {
    return storage.sendOffer(params);
  },
  respondToOffer: async (params) => {
    return storage.respondToOffer(params);
  },
};

// Mock-backed API service methods for offline / prototype usage
export const mockApiService = {
  getProducts: async () => storage.getStoredProducts(),
  getProduct: async (id) => storage.getProductById(id),
  createProduct: async (data) => storage.addProduct(data),
  updateProduct: async (id, data) => storage.updateProduct(id, data),
  deleteProduct: async (id) => storage.deleteProduct(id),
  getCurrentUser: () => storage.getCurrentUser(),
  login: async (credentials) => storage.saveUser(credentials),
  register: async (userData) => storage.saveUser(userData),
  getSavedProducts: async () => storage.getSavedProducts(),
  toggleSave: async (id) => storage.toggleSavedItem(id),
  getAdminStats: async () => {
    const products = storage.getStoredProducts();
    const users = storage.getStoredUsers();
    const reports = storage.getReportedListings();
    return {
      totalUsers: users.length,
      totalListings: products.length,
      activeListings: products.filter((p) => p.status === 'Active').length,
      soldListings: products.filter((p) => p.status === 'Sold').length,
      reportedCount: reports.length,
    };
  },
};

export default api;
