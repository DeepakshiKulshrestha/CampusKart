import "dotenv/config"; // must be first: imported modules (e.g. cloudinary.config.js) read process.env at load time
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import { authRouter, userRouter } from "./routes/authRoutes.js";
import productRouter from "./routes/productRoutes.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";

const app = express();

// Comma-separated list of allowed browser origins, e.g. "http://localhost:5173,https://campuskart.app"
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    // No Origin header means a non-browser client (Postman, curl), which is allowed.
    // A disallowed origin gets no CORS headers, so the browser blocks the response.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  })
);
app.use(express.json());
app.use("/api", apiLimiter);
app.post(["/api/auth/login", "/api/auth/register"], authLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CampusKart backend is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);

// Fallback error handler (malformed JSON, unexpected DB errors, ...)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
