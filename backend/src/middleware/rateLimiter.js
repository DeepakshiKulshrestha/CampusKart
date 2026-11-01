import { rateLimit } from "express-rate-limit";

// NOTE: when deployed behind a proxy (Render), every request appears to come from the proxy's IP,
// so all users would share one limit. Add app.set("trust proxy", 1) in index.js at that point.
// Not enabled for local development.

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
