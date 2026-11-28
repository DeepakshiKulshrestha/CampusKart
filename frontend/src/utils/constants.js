// Enum values shared with the backend. Keep in sync with backend/src/models/constants.js.
export const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Cycles', 'Stationery', 'Accessories', 'Appliances', 'Other'];

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export const PRODUCT_STATUS = ['AVAILABLE', 'SOLD', 'REMOVED'];
export const INTEREST_STATUS = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
export const TRANSACTION_STATUS = ['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
export const PAYMENT_STATUS = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
export const REPORT_REASONS = ['Fake listing', 'Wrong description', 'Suspicious price', 'Inappropriate content', 'Duplicate', 'Other'];
export const REPORT_STATUS = ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

// Must match the backend limits (backend/src/middleware/upload.js, Product.model.js)
export const MAX_IMAGES = 5;
export const MAX_IMAGE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AGE_MONTHS = 240;

// Tailwind classes for status badges, used across pages
export const STATUS_BADGE = {
  AVAILABLE: 'bg-[#B7FF00] text-[#111111]',
  SOLD: 'bg-[#111111] text-white',
  REMOVED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REFUNDED: 'bg-slate-200 text-slate-700',
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-700',
  REVIEWED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  DISMISSED: 'bg-slate-200 text-slate-700',
};

// "18 months" → "1 yr 6 mo"
export function formatAge(months) {
  const m = Number(months) || 0;
  if (m < 12) return `${m} month${m === 1 ? '' : 's'}`;
  const y = Math.floor(m / 12);
  const rest = m % 12;
  return `${y} yr${y === 1 ? '' : 's'}${rest ? ` ${rest} mo` : ''}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
