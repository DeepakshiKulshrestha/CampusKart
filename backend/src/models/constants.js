// Shared enums — import these in validators/frontend to keep values in sync
export const ROLES = ['STUDENT', 'ADMIN'];
export const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Cycles', 'Stationery', 'Accessories', 'Appliances', 'Other'];
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
export const PRODUCT_STATUS = ['AVAILABLE', 'SOLD', 'REMOVED'];
export const INTEREST_STATUS = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
export const PAYMENT_STATUS = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
export const TRANSACTION_STATUS = ['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
export const REPORT_REASONS = ['Fake listing', 'Wrong description', 'Suspicious price', 'Inappropriate content', 'Duplicate', 'Other'];
export const REPORT_STATUS = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];
export const URL_REGEX = /^https:\/\/res\.cloudinary\.com\/.+/i; // only Cloudinary https URLs allowed

// ---- Weeks 4–7 ----
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
export const FLAG_DECISIONS = ['FLAG_FOR_REVIEW', 'NO_FLAG'];
export const ADMIN_DECISIONS = ['PENDING', 'CONFIRMED', 'DISMISSED'];
export const PREDICTION_ENDPOINTS = ['predict-price', 'price-fairness'];
export const SEARCH_MODES = ['keyword', 'semantic'];
export const EMBEDDING_DIMENSIONS = 384; // all-MiniLM-L6-v2
// Allowed status changes (anything else is rejected by the model)
export const INTEREST_TRANSITIONS = { PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'], ACCEPTED: ['CANCELLED'] };
export const TRANSACTION_TRANSITIONS = { PENDING: ['COMPLETED', 'CANCELLED'], COMPLETED: ['REFUNDED'] };
export const REPORT_TRANSITIONS = { PENDING: ['REVIEWED', 'RESOLVED', 'DISMISSED'], REVIEWED: ['RESOLVED', 'DISMISSED'] };
