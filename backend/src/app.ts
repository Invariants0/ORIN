import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import rootRouter from "@/routes/index.js";
import { APIError } from "@/utils/errors.js";

const app = express();

// Trust Render's proxy for secure cookies and rate-limiting
app.set('trust proxy', 1);

/**
 * 🛠️ PRODUCTION HARDENING & ENHANCEMENTS
 */

// Request ID tracking for debugging
app.use((req, _res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  (req as any).requestId = requestId;
  next();
});

// Security middleware
app.use(helmet());

// Performance mitigation
app.use(compression());

// Global Rate Limiting (Protection against brute force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again after 15 minutes" },
});

if (envVars.NODE_ENV === "production") {
  app.use(limiter);
}

// CORS configuration
app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enhanced Logging middleware (with Request ID)
if (envVars.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // Production logging: format as JSON with Request ID
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`[HTTP] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        requestId: (req as any).requestId,
      });
    });
    next();
  });
}

// Register routes
app.use("/api", rootRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    requestId: (req as any).requestId,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  const requestId = (req as any).requestId;

  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      code: err.code || err.statusCode,
      message: err.message,
      requestId,
      stack: envVars.NODE_ENV === "development" ? err.stack : undefined,
    });
    return;
  }

  logger.error("[Express] Unhandled error:", {
    error: err.message,
    stack: err.stack,
    requestId,
  });

  res.status(500).json({
    code: 500,
    message: envVars.NODE_ENV === "development" ? err.message : "Internal server error",
    requestId,
    stack: envVars.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
