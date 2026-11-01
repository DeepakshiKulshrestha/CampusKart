import { z } from 'zod';
import { ROLES, URL_REGEX, CATEGORIES, CONDITIONS } from '../models/constants.js';

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

export {
  validationError,
  registerSchema,
  loginSchema,
  updateMeSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  myProductsQuerySchema,
};
