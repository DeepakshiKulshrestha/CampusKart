import axios from 'axios';
import * as storage from './storage';
import { sanitizeProduct } from '../utils/imageUrl';

// Base Axios instance. Set VITE_API_URL in frontend/.env (see frontend/.env.example).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
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
    // Let the browser set the multipart boundary for file uploads
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: an expired/invalid token logs the user out everywhere
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthEndpoint && storage.getToken()) {
        storage.clearUser();
        window.dispatchEvent(new Event('campuskart_logged_out'));
      }
    }
    return Promise.reject(error);
  }
);

// ---------- Error helpers (so pages can show what the backend said) ----------

// A readable message for any failed request
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : 'Cannot reach the CampusKart server. Check that the backend is running and VITE_API_URL is correct.';
  }
  const data = err.response.data || {};
  if (data.errors?.length && data.message === 'Validation failed') {
    return data.errors.map((e) => e.message).join(' • ');
  }
  return data.message || fallback;
}

// { fieldName: 'message' } from a 400 "Validation failed" response
export function getFieldErrors(err) {
  const errors = err?.response?.data?.errors || [];
  return Object.fromEntries(errors.map((e) => [e.field || 'form', e.message]));
}

// ---------- Shape adapters ----------

// Backend product → the shape the UI components use (id, categoryName, seller, image)
export function normalizeProduct(p) {
  if (!p) return p;
  const seller = p.sellerId && typeof p.sellerId === 'object' ? p.sellerId : null;
  const sellerName = seller?.name || 'Student';
  return sanitizeProduct({
    ...p,
    id: p._id || p.id,
    categoryName: p.category,
    sellerId: seller?._id || p.sellerId,
    seller: { id: seller?._id || p.sellerId, name: sellerName, avatar: sellerName.charAt(0).toUpperCase() },
  });
}

const withProducts = (data) => ({ ...data, items: (data.items || []).map(normalizeProduct) });

// ---------- Auth ----------
export const authApi = {
  // POST /api/auth/login -> { success, token, user }
  login: async (email, password) => (await api.post('/auth/login', { email, password })).data,
  // POST /api/auth/register -> { success, token, user }
  register: async ({ name, email, password }) => (await api.post('/auth/register', { name, email, password })).data,
  // POST /api/auth/logout: JWTs are stateless, so this only confirms; the client deletes the token
  logout: async () => {
    try {
      return (await api.post('/auth/logout')).data;
    } catch {
      return { success: true };
    }
  },
};

// ---------- Profile ----------
export const userApi = {
  getMe: async () => (await api.get('/users/me')).data,
  // Only name and profileImage (a Cloudinary URL or '') can be changed
  updateMe: async (payload) => (await api.put('/users/me', payload)).data,
};

// ---------- Products ----------
export const productApi = {
  // GET /api/products?search&category&condition&location&minPrice&maxPrice&sort&page&limit
  getProducts: async (params = {}) => withProducts((await api.get('/products', { params: cleanParams(params) })).data),
  getMyProducts: async (params = {}) => withProducts((await api.get('/products/mine', { params: cleanParams(params) })).data),
  getProductById: async (id) => {
    const data = (await api.get(`/products/${id}`)).data;
    return { ...data, product: normalizeProduct(data.product) };
  },
  // formData: multipart with fields + files under "images"
  createProduct: async (formData) => {
    const data = (await api.post('/products', formData, { timeout: 60000 })).data;
    return { ...data, product: normalizeProduct(data.product) };
  },
  updateProduct: async (id, payload) => {
    const data = (await api.put(`/products/${id}`, payload)).data;
    return { ...data, product: normalizeProduct(data.product) };
  },
  // Soft delete: the backend sets status REMOVED
  deleteProduct: async (id) => (await api.delete(`/products/${id}`)).data,
  markSold: async (id) => (await api.put(`/products/${id}/sold`)).data,
};

// ---------- Interests ----------
export const interestApi = {
  create: async (productId, message) => (await api.post(`/products/${productId}/interest`, { message })).data,
  // role: 'buyer' (sent) | 'seller' (received) | undefined (both)
  list: async (params = {}) => (await api.get('/interests', { params: cleanParams(params) })).data,
  updateStatus: async (id, status) => (await api.put(`/interests/${id}`, { status })).data,
};

// ---------- Transactions ----------
export const transactionApi = {
  create: async (interestId) => (await api.post('/transactions', { interestId })).data,
  list: async (params = {}) => (await api.get('/transactions', { params: cleanParams(params) })).data,
  getById: async (id) => (await api.get(`/transactions/${id}`)).data,
  // The backend decides the result. simulateFailure exists only to demo the failure path.
  pay: async (id, simulateFailure = false) => (await api.post(`/transactions/${id}/pay`, { simulateFailure })).data,
  cancel: async (id) => (await api.put(`/transactions/${id}/cancel`)).data,
};

// ---------- Reports ----------
export const reportApi = {
  create: async ({ productId, reason, details }) => (await api.post('/reports', { productId, reason, details })).data,
};

// ---------- Admin (backend checks the ADMIN role on every call) ----------
export const adminApi = {
  getDashboard: async () => (await api.get('/admin/dashboard')).data,
  getAnalytics: async (report, params = {}) => (await api.get(`/admin/analytics/${report}`, { params: cleanParams(params) })).data,
  getCommission: async () => (await api.get('/admin/commission')).data,
  updateCommission: async (commissionRate) => (await api.put('/admin/commission', { commissionRate })).data,
  getTransactions: async (params = {}) => (await api.get('/admin/transactions', { params: cleanParams(params) })).data,
  getReports: async (params = {}) => (await api.get('/admin/reports', { params: cleanParams(params) })).data,
  reviewReport: async (id, payload) => (await api.put(`/admin/reports/${id}`, payload)).data,
  getUsers: async (params = {}) => (await api.get('/admin/users', { params: cleanParams(params) })).data,
  setRestricted: async (id, isRestricted) => (await api.put(`/admin/users/${id}/restrict`, { isRestricted })).data,
  getProducts: async (params = {}) => (await api.get('/admin/products', { params: cleanParams(params) })).data,
  removeProduct: async (id, reason) => (await api.put(`/admin/products/${id}/remove`, { reason })).data,
};

// ---------- Local-only features (no backend for these yet) ----------

// Saved items ("wishlist") stay in this browser
export const savedApi = {
  getIds: () => storage.getSavedItemIds(),
  isSaved: (id) => storage.isItemSaved(id),
  toggle: (id) => storage.toggleSavedItem(id),
};

// Chat is a demo stored on this device only (outside the blueprint)
export const chatApi = {
  getConversations: async (userId, userEmail) => storage.getConversationsByUser(userId, userEmail),
  getConversationById: async (id) => storage.getConversationById(id),
  getOrCreateConversation: async (params) => storage.getOrCreateConversation(params),
  sendMessage: async (params) => storage.sendMessage(params),
  sendOffer: async (params) => storage.sendOffer(params),
  respondToOffer: async (params) => storage.respondToOffer(params),
};

// Drop empty filter values so they don't reach the backend as ""
function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'));
}

export default api;
