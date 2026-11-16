import {
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  INITIAL_REPORTED_LISTINGS,
  INITIAL_ACTIVITIES,
  INITIAL_INTERESTS,
  INITIAL_TRANSACTIONS,
  INITIAL_CONVERSATIONS,
  CATEGORIES,
} from '../data/mockData';
import {
  sanitizeProduct,
  getProductImageUrl,
  getProductImages,
  resolveImageUrl,
  DEFAULT_PRODUCT_IMAGE,
} from '../utils/imageUrl';

const STORAGE_VERSION_KEY = 'campuskart_storage_version';
const CURRENT_VERSION = 'tiet_v2';

const PRODUCTS_KEY = 'campuskart_products';
const USER_KEY = 'campusMarketUser';
const TOKEN_KEY = 'campuskart_token';
const SAVED_ITEMS_KEY = 'campuskart_saved_ids';
const REPORTED_KEY = 'campuskart_reported';
const USERS_KEY = 'campuskart_users';
const ACTIVITIES_KEY = 'campuskart_activities';
const INTERESTS_KEY = 'campuskart_interests';
const TRANSACTIONS_KEY = 'campuskart_transactions';
const CONVERSATIONS_KEY = 'campuskart_conversations';

// --- Format INR Helper ---
export function formatINR(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

// --- Image File to Base64 Data URL Helper ---
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      return resolve(typeof file === 'string' ? file : '');
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files = []) {
  if (!files || files.length === 0) return [];
  return Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
}

// --- JWT Token helpers ---
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Initialize defaults in localStorage if not set or migrate if older version
export function initLocalStorage() {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);

  // If storage is uninitialized or from legacy version, seed fresh TIET data
  if (storedVersion !== CURRENT_VERSION) {
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(REPORTED_KEY, JSON.stringify(INITIAL_REPORTED_LISTINGS));
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(['prod-1', 'prod-3', 'prod-5']));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(INITIAL_ACTIVITIES));
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(INITIAL_INTERESTS));
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(INITIAL_CONVERSATIONS));

    // Seed default student: Aarav Sharma (Hostel J, Computer Engineering)
    const defaultStudent = {
      id: 'user-1',
      name: 'Aarav Sharma',
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'asharma_be23@thapar.edu',
      college: 'Thapar Institute of Engineering & Technology',
      role: 'STUDENT',
      isLoggedIn: true,
      major: 'Computer Engineering',
      phone: '+91 98765 43210',
      dorm: 'Hostel J, Room 314',
      bio: '3rd year Computer Engineering student at TIET. Passionate about systems programming, robotics, and campus hardware reuse. Selling gear I no longer need.',
      joinedDate: 'August 2023',
      verified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      itemsSold: 9,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(defaultStudent));
    return;
  }

  // Otherwise, ensure every key exists
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(REPORTED_KEY)) {
    localStorage.setItem(REPORTED_KEY, JSON.stringify(INITIAL_REPORTED_LISTINGS));
  }
  if (!localStorage.getItem(SAVED_ITEMS_KEY)) {
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(['prod-1', 'prod-3', 'prod-5']));
  }
  if (!localStorage.getItem(ACTIVITIES_KEY)) {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(INITIAL_ACTIVITIES));
  }
  if (!localStorage.getItem(INTERESTS_KEY)) {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(INITIAL_INTERESTS));
  }
  if (!localStorage.getItem(TRANSACTIONS_KEY)) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
  }
  if (!localStorage.getItem(CONVERSATIONS_KEY)) {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
  }

  if (!localStorage.getItem(USER_KEY)) {
    const defaultStudent = {
      id: 'user-1',
      name: 'Aarav Sharma',
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'asharma_be23@thapar.edu',
      college: 'Thapar Institute of Engineering & Technology',
      role: 'STUDENT',
      isLoggedIn: true,
      major: 'Computer Engineering',
      phone: '+91 98765 43210',
      dorm: 'Hostel J, Room 314',
      bio: '3rd year Computer Engineering student at TIET. Passionate about systems programming, robotics, and campus hardware reuse.',
      joinedDate: 'August 2023',
      verified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      itemsSold: 9,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(defaultStudent));
  }
}

// Ensure init runs immediately
initLocalStorage();

// --- Products API ---
export function getStoredProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    return Array.isArray(parsed) ? parsed.map(sanitizeProduct) : INITIAL_PRODUCTS.map(sanitizeProduct);
  } catch {
    return INITIAL_PRODUCTS.map(sanitizeProduct);
  }
}

export function saveStoredProducts(products) {
  const sanitized = Array.isArray(products) ? products.map(sanitizeProduct) : [];
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(sanitized));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campuskart_product_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function getProductById(id) {
  const products = getStoredProducts();
  return products.find((p) => String(p.id) === String(id)) || null;
}

export function addProduct(newProductData) {
  const products = getStoredProducts();
  const currentUser = getCurrentUser();

  const categoryId = newProductData.category || 'miscellaneous';
  const matchedCategory = CATEGORIES.find(c => c.id === categoryId);

  const images = Array.isArray(newProductData.images) && newProductData.images.length > 0
    ? newProductData.images
    : (newProductData.image ? [newProductData.image] : [DEFAULT_PRODUCT_IMAGE]);
  const primaryImage = images[0] || DEFAULT_PRODUCT_IMAGE;

  const rawProduct = {
    id: newProductData.id || `prod-${Date.now()}`,
    title: newProductData.title,
    price: parseFloat(newProductData.price) || 0,
    condition: newProductData.condition || 'Good',
    category: categoryId,
    categoryName: matchedCategory ? matchedCategory.name : (newProductData.categoryName || 'Miscellaneous'),
    description: newProductData.description || '',
    location: newProductData.location || 'TIET Campus, Patiala',
    image: primaryImage,
    images: images,
    seller: newProductData.seller || {
      id: currentUser?.id || 'user-1',
      name: [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'TIET Student',
      email: currentUser?.email || 'asharma_be23@thapar.edu',
      avatar: (currentUser?.firstName?.[0] || 'A').toUpperCase(),
      avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      rating: 5.0,
      reviewsCount: 1,
      college: currentUser?.college || 'Thapar Institute of Engineering & Technology',
      department: currentUser?.major || 'Engineering',
      joinedYear: '2024',
      verified: true,
    },
    status: newProductData.status || 'Active',
    views: 1,
    saves: 0,
    createdAt: newProductData.createdAt || new Date().toISOString(),
    featured: false,
  };

  const newProduct = sanitizeProduct(rawProduct);
  const updated = [newProduct, ...products];
  saveStoredProducts(updated);

  addActivity({
    type: 'listing_created',
    title: 'New Listing Posted',
    description: `You published "${newProduct.title}"`,
    icon: 'Tag',
  });

  return newProduct;
}

export function updateProduct(id, updates) {
  const products = getStoredProducts();
  const index = products.findIndex((p) => String(p.id) === String(id));
  if (index === -1) return null;

  const current = products[index];
  const images = Array.isArray(updates.images)
    ? updates.images
    : (updates.image ? [updates.image] : current.images);
  const primaryImage = images && images.length > 0 ? images[0] : (updates.image || current.image);

  const rawUpdated = {
    ...current,
    ...updates,
    image: primaryImage,
    images: images,
    price: updates.price !== undefined ? parseFloat(updates.price) : current.price,
    categoryName: updates.category ? (CATEGORIES.find(c => c.id === updates.category)?.name || current.categoryName) : current.categoryName,
    updatedAt: new Date().toISOString(),
  };

  const updatedProduct = sanitizeProduct(rawUpdated);
  products[index] = updatedProduct;
  saveStoredProducts(products);
  return updatedProduct;
}

export function deleteProduct(id) {
  const products = getStoredProducts();
  const filtered = products.filter((p) => String(p.id) !== String(id));
  saveStoredProducts(filtered);
  return true;
}

export function markProductAsSold(productId) {
  const products = getStoredProducts();
  const idx = products.findIndex((p) => String(p.id) === String(productId));
  if (idx !== -1) {
    products[idx] = {
      ...products[idx],
      status: 'Sold',
      soldAt: new Date().toISOString(),
    };
    saveStoredProducts(products);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('campuskart_product_updated', {
          detail: { productId, status: 'SOLD' },
        })
      );
    }
    return products[idx];
  }
  return null;
}

// --- User / Auth API ---
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.isLoggedIn ? user : null;
  } catch {
    return null;
  }
}

export function saveUser(userData) {
  if (userData.token) {
    setToken(userData.token);
  }

  const nameParts = (userData.name || '').trim().split(/\s+/);
  const derivedFirst = nameParts[0] || '';
  const derivedLast = nameParts.slice(1).join(' ') || '';

  const user = {
    id: userData._id || userData.id || `user-${Date.now()}`,
    name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 'Student',
    firstName: userData.firstName || derivedFirst || 'Student',
    lastName: userData.lastName || derivedLast || '',
    email: userData.email || '',
    college: userData.college || 'Thapar Institute of Engineering & Technology',
    role: userData.role || (userData.email?.toLowerCase().includes('admin') ? 'ADMIN' : 'STUDENT'),
    isLoggedIn: true,
    phone: userData.phone || '+91 98765 00000',
    major: userData.major || 'Engineering Studies',
    dorm: userData.dorm || 'Hostel J, TIET',
    bio: userData.bio || 'CampusKart Thapar student member.',
    joinedDate: userData.joinedDate || 'Recent',
    verified: true,
    avatarUrl: userData.profileImage || userData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    itemsSold: userData.itemsSold || 0,
    isRestricted: userData.isRestricted || false,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function updateUserProfile(updates) {
  const current = getCurrentUser();
  if (!current) return null;
  const updated = { ...current, ...updates };
  localStorage.setItem(USER_KEY, JSON.stringify(updated));

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.email === updated.email || u.id === updated.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return updated;
}

export function removeCurrentUser() {
  localStorage.removeItem(USER_KEY);
  removeToken();
}

export function clearUser() {
  removeCurrentUser();
}

export function updateUserStatus(userId, status) {
  const users = getStoredUsers();
  const idx = users.findIndex((u) => String(u.id) === String(userId));
  if (idx !== -1) {
    users[idx].status = status;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users[idx];
  }
  return null;
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function toggleUserRestriction(userId) {
  const users = getStoredUsers();
  const idx = users.findIndex((u) => String(u.id) === String(userId));
  if (idx !== -1) {
    users[idx].isRestricted = !users[idx].isRestricted;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return users[idx];
  }
  return null;
}

// --- Saved / Wishlist API ---
export function getSavedItemIds() {
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isItemSaved(id) {
  const saved = getSavedItemIds();
  return saved.includes(String(id));
}

export function toggleSavedItem(id) {
  const saved = getSavedItemIds();
  const strId = String(id);
  let updated;
  if (saved.includes(strId)) {
    updated = saved.filter((item) => item !== strId);
  } else {
    updated = [...saved, strId];
  }
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(updated));
  return updated.includes(strId);
}

export function getSavedProducts() {
  const savedIds = getSavedItemIds();
  const products = getStoredProducts();
  return products.filter((p) => savedIds.includes(String(p.id)));
}

// --- Reported Listings API ---
export function getReportedListings() {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    return raw ? JSON.parse(raw) : INITIAL_REPORTED_LISTINGS;
  } catch {
    return INITIAL_REPORTED_LISTINGS;
  }
}

export function reportListing({ productId, reason, details }) {
  const reports = getReportedListings();
  const product = getProductById(productId);
  const currentUser = getCurrentUser();

  const newReport = {
    id: `rep-${Date.now()}`,
    productId,
    productTitle: product?.title || 'Unknown Item',
    sellerName: product?.seller?.name || 'Unknown Seller',
    reportedBy: currentUser ? `${currentUser.name} (${currentUser.email})` : 'Anonymous Student',
    reason,
    details: details || '',
    reportedAt: new Date().toISOString(),
    status: 'Pending',
    severity: 'Medium',
  };

  const updated = [newReport, ...reports];
  localStorage.setItem(REPORTED_KEY, JSON.stringify(updated));
  return newReport;
}

export function resolveReport(reportId, action = 'Dismissed') {
  const reports = getReportedListings();
  const updated = reports.map((r) =>
    String(r.id) === String(reportId)
      ? { ...r, status: 'Resolved', resolutionAction: action, resolvedAt: new Date().toISOString() }
      : r
  );
  localStorage.setItem(REPORTED_KEY, JSON.stringify(updated));
  return updated;
}

export function dismissReport(reportId) {
  return resolveReport(reportId, 'Dismissed');
}

export function removeListingByAdmin(productId, reportId) {
  deleteProduct(productId);
  if (reportId) {
    resolveReport(reportId, 'Listing Removed');
  }
}

// --- Activity Log API ---
export function getActivities() {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : INITIAL_ACTIVITIES;
  } catch {
    return INITIAL_ACTIVITIES;
  }
}

export function addActivity({ type, title, description, icon }) {
  const activities = getActivities();
  const newActivity = {
    id: `act-${Date.now()}`,
    type,
    title,
    description,
    time: 'Just now',
    icon: icon || 'Tag',
  };
  const updated = [newActivity, ...activities.slice(0, 19)];
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(updated));
  return newActivity;
}

// --- Interests API ---
export function getInterests() {
  try {
    const raw = localStorage.getItem(INTERESTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_INTERESTS;
  } catch {
    return INITIAL_INTERESTS;
  }
}

export function saveInterests(interests) {
  localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campuskart_interest_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function getInterestById(id) {
  const interests = getInterests();
  return interests.find((item) => String(item.id) === String(id)) || null;
}

export function getInterestsBySeller(sellerId, sellerEmail) {
  const interests = getInterests();
  return interests.filter(
    (item) =>
      String(item.sellerId) === String(sellerId) ||
      (sellerEmail && item.sellerEmail?.toLowerCase() === sellerEmail.toLowerCase())
  );
}

export function getInterestsByBuyer(buyerId, buyerEmail) {
  const interests = getInterests();
  return interests.filter(
    (item) =>
      String(item.buyerId) === String(buyerId) ||
      (buyerEmail && item.buyerEmail?.toLowerCase() === buyerEmail.toLowerCase())
  );
}

export function getInterestByProductAndBuyer(productId, buyerId, buyerEmail) {
  const interests = getInterests();
  return (
    interests.find(
      (item) =>
        String(item.productId) === String(productId) &&
        (String(item.buyerId) === String(buyerId) ||
          (buyerEmail && item.buyerEmail?.toLowerCase() === buyerEmail.toLowerCase()))
    ) || null
  );
}

export function createInterest({ productId, buyer, seller, message = '' }) {
  if (!buyer || !seller) {
    throw new Error('Buyer and seller information are required.');
  }

  const buyerId = buyer.id || buyer._id;
  const sellerId = seller.id || seller._id;
  const buyerEmail = buyer.email?.toLowerCase();
  const sellerEmail = seller.email?.toLowerCase();

  if (
    (buyerId && sellerId && String(buyerId) === String(sellerId)) ||
    (buyerEmail && sellerEmail && buyerEmail === sellerEmail)
  ) {
    throw new Error('You cannot express interest in your own listing.');
  }

  const product = getProductById(productId);
  if (!product) {
    throw new Error('Product not found.');
  }
  const isSold = product.status?.toUpperCase() === 'SOLD';
  if (isSold) {
    throw new Error('This product is already marked as SOLD.');
  }

  const existing = getInterestByProductAndBuyer(productId, buyerId, buyerEmail);
  if (existing) {
    return { ...existing, isExisting: true };
  }

  const interests = getInterests();
  const newInterest = {
    id: `int-${Date.now()}`,
    productId: product.id,
    productTitle: product.title,
    productImage: product.image,
    productPrice: product.price,
    sellerId: sellerId || 'seller-unknown',
    sellerName: seller.name || 'Seller',
    sellerEmail: seller.email || '',
    buyerId: buyerId || 'buyer-unknown',
    buyerName: buyer.name || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'TIET Student',
    buyerEmail: buyer.email || '',
    buyerAvatar: buyer.avatarUrl || '',
    message: (message || '').trim().slice(0, 500),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  const updated = [newInterest, ...interests];
  saveInterests(updated);

  addActivity({
    type: 'interest_sent',
    title: 'Interest Expressed',
    description: `You sent an interest request for "${product.title}"`,
    icon: 'MessageSquare',
  });

  return newInterest;
}

export function updateInterestStatus(interestId, status) {
  const interests = getInterests();
  const index = interests.findIndex((item) => String(item.id) === String(interestId));
  if (index === -1) {
    throw new Error('Interest request not found.');
  }

  const current = interests[index];
  interests[index] = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };

  saveInterests(interests);

  addActivity({
    type: 'interest_updated',
    title: `Interest ${status === 'ACCEPTED' ? 'Accepted' : 'Updated'}`,
    description: `Interest request for "${current.productTitle}" marked as ${status}`,
    icon: status === 'ACCEPTED' ? 'CheckCircle' : 'XCircle',
  });

  return interests[index];
}

// --- Conversations & Student Chat API ---
export function getConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CONVERSATIONS;
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

export function saveConversations(conversations) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campuskart_chat_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function getConversationById(id) {
  const conversations = getConversations();
  return conversations.find((c) => String(c.id) === String(id)) || null;
}

export function getConversationsByUser(userId, userEmail) {
  const conversations = getConversations();
  return conversations.filter(
    (c) =>
      String(c.buyerId) === String(userId) ||
      String(c.sellerId) === String(userId) ||
      (userEmail &&
        (c.buyerEmail?.toLowerCase() === userEmail.toLowerCase() ||
          c.sellerEmail?.toLowerCase() === userEmail.toLowerCase()))
  );
}

export function getOrCreateConversation({ productId, buyer, seller }) {
  if (!productId || !buyer || !seller) {
    throw new Error('Product, buyer, and seller are required to start a chat.');
  }

  const buyerId = buyer.id || buyer._id;
  const sellerId = seller.id || seller._id;
  const buyerEmail = buyer.email?.toLowerCase();
  const sellerEmail = seller.email?.toLowerCase();

  const conversations = getConversations();
  const existing = conversations.find(
    (c) =>
      String(c.productId) === String(productId) &&
      (String(c.buyerId) === String(buyerId) || (buyerEmail && c.buyerEmail?.toLowerCase() === buyerEmail)) &&
      (String(c.sellerId) === String(sellerId) || (sellerEmail && c.sellerEmail?.toLowerCase() === sellerEmail))
  );

  if (existing) {
    return existing;
  }

  const product = getProductById(productId);
  const newConversation = {
    id: `conv-${Date.now()}`,
    productId,
    productTitle: product?.title || 'Campus Item',
    productPrice: product?.price || 0,
    productImage: product?.image || '',
    productLocation: product?.location || 'TIET Campus',
    sellerId: sellerId || product?.seller?.id || 'seller-unknown',
    sellerName: seller.name || product?.seller?.name || 'Seller',
    sellerEmail: seller.email || product?.seller?.email || '',
    sellerAvatar: seller.avatarUrl || product?.seller?.avatarUrl || '',
    buyerId: buyerId || 'buyer-unknown',
    buyerName: buyer.name || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'TIET Buyer',
    buyerEmail: buyer.email || '',
    buyerAvatar: buyer.avatarUrl || '',
    agreedPrice: null,
    status: 'ACTIVE',
    lastMessageText: 'Conversation started',
    lastMessageAt: new Date().toISOString(),
    messages: [
      {
        id: `msg-${Date.now()}`,
        senderId: 'SYSTEM',
        senderName: 'CampusKart',
        text: `Negotiation chat opened for "${product?.title || 'this item'}". You can discuss pickup location at Thapar and make offers below!`,
        timestamp: new Date().toISOString(),
        type: 'SYSTEM',
      },
    ],
  };

  const updated = [newConversation, ...conversations];
  saveConversations(updated);
  return newConversation;
}

export function sendMessage({ conversationId, senderId, senderName, text, type = 'TEXT', offer = null }) {
  const conversations = getConversations();
  const idx = conversations.findIndex((c) => String(c.id) === String(conversationId));
  if (idx === -1) {
    throw new Error('Conversation not found.');
  }

  const current = conversations[idx];
  const newMsg = {
    id: `msg-${Date.now()}`,
    senderId,
    senderName,
    text: text || '',
    timestamp: new Date().toISOString(),
    type,
    ...(offer ? { offer } : {}),
  };

  const updatedMessages = [...(current.messages || []), newMsg];
  let agreedPrice = current.agreedPrice;

  // If this message accepted an offer, record the agreed price
  if (type === 'OFFER_ACCEPTED' && offer?.amount) {
    agreedPrice = parseFloat(offer.amount);
  }

  const updatedConv = {
    ...current,
    messages: updatedMessages,
    lastMessageText: text || (type.includes('OFFER') ? `Offer: ₹${offer?.amount}` : 'New message'),
    lastMessageAt: new Date().toISOString(),
    agreedPrice,
  };

  conversations[idx] = updatedConv;
  saveConversations(conversations);

  return { conversation: updatedConv, message: newMsg };
}

export function sendOffer({ conversationId, offeredBy, offeredByName, amount, isCounter = false }) {
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    throw new Error('Please enter a valid offer amount in INR.');
  }

  const offer = {
    offerId: `off-${Date.now()}`,
    amount: numAmount,
    status: 'PENDING',
    offeredBy,
    offeredByName,
  };

  const text = isCounter
    ? `${offeredByName} proposed a counteroffer of ₹${numAmount.toLocaleString('en-IN')}`
    : `${offeredByName} made an offer of ₹${numAmount.toLocaleString('en-IN')}`;

  return sendMessage({
    conversationId,
    senderId: offeredBy,
    senderName: offeredByName,
    text,
    type: isCounter ? 'COUNTER_OFFER' : 'OFFER',
    offer,
  });
}

export function respondToOffer({ conversationId, offerId, response, responderId, responderName }) {
  const conversations = getConversations();
  const idx = conversations.findIndex((c) => String(c.id) === String(conversationId));
  if (idx === -1) {
    throw new Error('Conversation not found.');
  }

  const conv = conversations[idx];
  // Locate the message containing this offer and update its status
  let foundOffer = null;
  const updatedMessages = conv.messages.map((m) => {
    if (m.offer && String(m.offer.offerId) === String(offerId)) {
      foundOffer = {
        ...m.offer,
        status: response === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      };
      return {
        ...m,
        offer: foundOffer,
      };
    }
    return m;
  });

  const targetAmount = foundOffer?.amount || conv.productPrice;

  // Append response message
  const isAccepted = response === 'ACCEPT';
  const followUpMsg = {
    id: `msg-${Date.now()}`,
    senderId: responderId,
    senderName: responderName,
    text: isAccepted
      ? `Deal accepted! Agreed price: ₹${targetAmount.toLocaleString('en-IN')}. Proceed to checkout or arrange meetup payment.`
      : `Offer of ₹${targetAmount.toLocaleString('en-IN')} was declined.`,
    timestamp: new Date().toISOString(),
    type: isAccepted ? 'OFFER_ACCEPTED' : 'OFFER_REJECTED',
    offer: foundOffer,
  };

  const updatedConv = {
    ...conv,
    messages: [...updatedMessages, followUpMsg],
    lastMessageText: followUpMsg.text,
    lastMessageAt: new Date().toISOString(),
    agreedPrice: isAccepted ? targetAmount : conv.agreedPrice,
  };

  conversations[idx] = updatedConv;
  saveConversations(conversations);

  return { conversation: updatedConv, message: followUpMsg };
}

// --- Transactions API (Transparent 5% Platform Commission) ---
export function getTransactions() {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TRANSACTIONS;
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(txns) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('campuskart_transaction_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export function getTransactionById(id) {
  const txns = getTransactions();
  return txns.find((t) => String(t.id) === String(id)) || null;
}

export function getTransactionsByBuyer(buyerId, buyerEmail) {
  const txns = getTransactions();
  return txns.filter(
    (t) =>
      String(t.buyerId) === String(buyerId) ||
      (buyerEmail && t.buyerEmail?.toLowerCase() === buyerEmail.toLowerCase())
  );
}

export function getTransactionsBySeller(sellerId, sellerEmail) {
  const txns = getTransactions();
  return txns.filter(
    (t) =>
      String(t.sellerId) === String(sellerId) ||
      (sellerEmail && t.sellerEmail?.toLowerCase() === sellerEmail.toLowerCase())
  );
}

export function createTransaction({
  productId,
  productTitle,
  productImage,
  buyerId,
  buyerName,
  buyerEmail,
  sellerId,
  sellerName,
  sellerEmail,
  amount,
  paymentMethod = 'UPI (Google Pay)',
  interestId,
  conversationId,
}) {
  const price = parseFloat(amount) || 0;
  const commissionRate = 5; // Transparent 5% platform commission
  const commissionAmount = Math.round(price * 0.05 * 100) / 100;
  const sellerAmount = Math.round((price - commissionAmount) * 100) / 100;

  const newTxn = {
    id: `txn-${Date.now()}`,
    productId,
    productTitle: productTitle || 'Campus Product',
    productImage: productImage || '',
    buyerId: buyerId || 'buyer-unknown',
    buyerName: buyerName || 'TIET Buyer',
    buyerEmail: buyerEmail || '',
    sellerId: sellerId || 'seller-unknown',
    sellerName: sellerName || 'TIET Seller',
    sellerEmail: sellerEmail || '',
    amount: price,
    commissionRate,
    commissionAmount,
    sellerAmount,
    paymentStatus: 'SUCCESS',
    transactionStatus: 'COMPLETED',
    paymentMethod,
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    interestId: interestId || null,
    conversationId: conversationId || null,
  };

  const txns = getTransactions();
  const updated = [newTxn, ...txns];
  saveTransactions(updated);

  // Reactively mark product as SOLD
  markProductAsSold(productId);

  // Update interest status if linked
  if (interestId) {
    try {
      updateInterestStatus(interestId, 'COMPLETED');
    } catch {
      // non-fatal
    }
  }

  // Update conversation if linked
  if (conversationId) {
    try {
      const conversations = getConversations();
      const cIdx = conversations.findIndex((c) => String(c.id) === String(conversationId));
      if (cIdx !== -1) {
        conversations[cIdx].status = 'COMPLETED';
        conversations[cIdx].messages.push({
          id: `msg-${Date.now()}`,
          senderId: 'SYSTEM',
          senderName: 'CampusKart',
          text: `Payment of ₹${price.toLocaleString('en-IN')} confirmed via ${paymentMethod}. Product is marked as SOLD.`,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM',
        });
        saveConversations(conversations);
      }
    } catch {
      // non-fatal
    }
  }

  addActivity({
    type: 'transaction_completed',
    title: 'Payment Confirmed',
    description: `Transaction of ₹${price.toLocaleString('en-IN')} completed for "${newTxn.productTitle}"`,
    icon: 'Package',
  });

  return newTxn;
}
