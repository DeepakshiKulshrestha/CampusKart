import { rateLimit } from "express-rate-limit";

// NOTE: behind a proxy (Render), every request would appear to come from the proxy's IP and all users
// would share one limit. index.js sets app.set("trust proxy", 1) when NODE_ENV=production to fix that.

const WINDOW_MS = 15 * 60 * 1000;

const limiterOptions = {
  windowMs: WINDOW_MS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
};

// All /api routes
const apiLimiter = rateLimit({ ...limiterOptions, limit: 300 });

// Login and register only: slows down password guessing and mass signups
const authLimiter = rateLimit({ ...limiterOptions, limit: 20 });

export { apiLimiter, authLimiter };
