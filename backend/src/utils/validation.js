import { z } from 'zod';
import { ROLES, URL_REGEX } from '../models/constants.js';

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

export { registerSchema, loginSchema, updateMeSchema };
