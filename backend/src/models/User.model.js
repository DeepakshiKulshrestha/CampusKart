import mongoose from 'mongoose';
import { ROLES, URL_REGEX } from './constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // unique index (Week 2)
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true, select: false }, // never returned unless .select('+passwordHash')
    role: { type: String, enum: ROLES, default: 'STUDENT' },
    profileImage: {
      type: String,
      default: '',
      validate: { validator: (v) => !v || URL_REGEX.test(v), message: 'profileImage must be a Cloudinary URL' },
    },
    isRestricted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { transform: (_, r) => { delete r.passwordHash; delete r.__v; return r; } } }
);

userSchema.index({ role: 1, createdAt: -1 }); // admin user lists

const User = mongoose.model('User', userSchema);
export default User;
