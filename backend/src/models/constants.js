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
