import { z } from 'zod';
import {
  ROLES,
  URL_REGEX,
  CATEGORIES,
  CONDITIONS,
  INTEREST_STATUS,
  TRANSACTION_STATUS,
  PRODUCT_STATUS,
  REPORT_REASONS,
  REPORT_STATUS,
} from '../models/constants.js';
import { OBJECT_ID } from './http.js';

function validationError(res, zodError) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: zodError.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  });
}

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'));

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
  email,
  // bcrypt only uses the first 72 bytes, so cap the length
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
  role: z.enum(ROLES).default('STUDENT'),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

// Only name and profileImage are user-editable; any other keys (email, role, ...) are stripped.
const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
    profileImage: z.string().refine((v) => v === '' || URL_REGEX.test(v), 'profileImage must be a Cloudinary URL'),
  })
  .partial()
  .refine((d) => d.name !== undefined || d.profileImage !== undefined, 'Provide name or profileImage to update');

// ---- Products ----
// Multipart fields and query params arrive as strings, so numbers are coerced. A blank field counts as missing.
const blankToUndefined = (v) => (v === '' || v === null ? undefined : v);
const num = (label, build = (s) => s) => z.preprocess(blankToUndefined, build(z.coerce.number(`${label} must be a number`)));

const productFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title must be at most 100 characters'),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description must be at most 2000 characters'),
  category: z.enum(CATEGORIES),
  brand: z.preprocess(blankToUndefined, z.string().trim().max(50, 'Brand must be at most 50 characters').optional()),
  originalPrice: num('Original price', (s) => s.min(0, 'Original price cannot be negative')),
  price: num('Price', (s) => s.min(0, 'Price cannot be negative')),
  age: num('Age', (s) => s.int('Age must be a whole number of months').min(0).max(240, 'Age cannot exceed 240 months')),
  condition: z.enum(CONDITIONS),
  location: z.string().trim().min(1, 'Location is required'),
};

// sellerId, status, images and anything else in the body are stripped
const createProductSchema = z.object(productFields);

const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Provide at least one field to update');

const pageFields = {
  page: num('page', (s) => s.int('page must be a whole number').min(1, 'page must be at least 1').default(1)),
  // values above 50 are clamped rather than rejected
  limit: num('limit', (s) =>
    s.int('limit must be a whole number').min(1, 'limit must be at least 1').transform((n) => Math.min(n, 50)).default(12)
  ),
};

const myProductsQuerySchema = z.object(pageFields);

const productQuerySchema = z
  .object({
    ...pageFields,
    search: z.preprocess(blankToUndefined, z.string().trim().min(1).max(100).optional()),
    category: z.preprocess(blankToUndefined, z.enum(CATEGORIES).optional()),
    condition: z.preprocess(blankToUndefined, z.enum(CONDITIONS).optional()),
    location: z.preprocess(blankToUndefined, z.string().trim().min(1).optional()),
    minPrice: num('minPrice', (s) => s.min(0, 'minPrice cannot be negative').optional()),
    maxPrice: num('maxPrice', (s) => s.min(0, 'maxPrice cannot be negative').optional()),
    sort: z.preprocess(blankToUndefined, z.enum(['newest', 'oldest', 'price_asc', 'price_desc']).optional()),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  });

// ---- Shared ----
const objectId = (label) => z.string(`${label} is required`).regex(OBJECT_ID, `Invalid ${label}`);
const optionalEnum = (values) => z.preprocess(blankToUndefined, z.enum(values).optional());
// "buyer" = things I bought / asked for, "seller" = things sold / asked from me; omitted = both
const roleFilter = optionalEnum(['buyer', 'seller']);

// ---- Interests ----
const createInterestSchema = z.object({
  message: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.string().trim().max(500, 'Message must be at most 500 characters').optional()
  ),
});

const interestQuerySchema = z.object({ ...pageFields, role: roleFilter, status: optionalEnum(INTEREST_STATUS) });

// Who may set which status is checked in the controller (seller: ACCEPTED/REJECTED, buyer: CANCELLED)
const updateInterestSchema = z.object({ status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']) });

// ---- Transactions ----
const createTransactionSchema = z.object({ interestId: objectId('interestId') });

// Payment is simulated: the backend decides the outcome. simulateFailure only exists for testing the failure path.
const payTransactionSchema = z.object({ simulateFailure: z.boolean().optional().default(false) });

const transactionQuerySchema = z.object({ ...pageFields, role: roleFilter, status: optionalEnum(TRANSACTION_STATUS) });

// ---- Admin ----
const commissionSchema = z.object({
  commissionRate: z
    .number('commissionRate must be a number')
    .min(0, 'commissionRate cannot be negative')
    .max(100, 'commissionRate cannot exceed 100'),
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
// Same values as resolveRange() in services/analytics.service.js
const rangeFields = {
  range: optionalEnum(['today', 'week', 'month', 'year', 'all', 'custom']),
  from: z.preprocess(blankToUndefined, z.string().regex(DATE, 'from must be YYYY-MM-DD').optional()),
  to: z.preprocess(blankToUndefined, z.string().regex(DATE, 'to must be YYYY-MM-DD').optional()),
};

const adminTransactionQuerySchema = z.object({ ...pageFields, ...rangeFields, status: optionalEnum(TRANSACTION_STATUS) });

const analyticsQuerySchema = z.object({
  ...rangeFields,
  granularity: optionalEnum(['hour', 'day', 'month']),
  limit: num('limit', (s) => s.int().min(1, 'limit must be at least 1').max(20, 'limit cannot exceed 20').optional()),
});

const searchText = z.preprocess(blankToUndefined, z.string().trim().min(1).max(100, 'search must be at most 100 characters').optional());

const adminUserQuerySchema = z.object({ ...pageFields, search: searchText, role: optionalEnum(ROLES) });

const restrictUserSchema = z.object({ isRestricted: z.boolean('isRestricted must be true or false') });

const adminProductQuerySchema = z.object({ ...pageFields, search: searchText, status: optionalEnum(PRODUCT_STATUS) });

const removeProductSchema = z.object({
  reason: z.preprocess(blankToUndefined, z.string().trim().max(500, 'reason must be at most 500 characters').optional()),
});

// ---- Reports ----
const createReportSchema = z.object({
  productId: objectId('productId'),
  reason: z.enum(REPORT_REASONS),
  details: z.preprocess(blankToUndefined, z.string().trim().max(1000, 'details must be at most 1000 characters').optional()),
});

const adminReportQuerySchema = z.object({ ...pageFields, status: optionalEnum(REPORT_STATUS) });

const reviewReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
  adminNote: z.preprocess(blankToUndefined, z.string().trim().max(1000, 'adminNote must be at most 1000 characters').optional()),
  removeListing: z.boolean().optional().default(false),
});

export {
  validationError,
  registerSchema,
  loginSchema,
  updateMeSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  myProductsQuerySchema,
  createInterestSchema,
  interestQuerySchema,
  updateInterestSchema,
  createTransactionSchema,
  payTransactionSchema,
  transactionQuerySchema,
  commissionSchema,
  rangeFields,
  adminTransactionQuerySchema,
  analyticsQuerySchema,
  adminUserQuerySchema,
  restrictUserSchema,
  adminProductQuerySchema,
  removeProductSchema,
  createReportSchema,
  adminReportQuerySchema,
  reviewReportSchema,
};
