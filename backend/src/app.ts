import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import rootRouter from "@/routes/index.js";
import { APIError } from "@/utils/errors.js";

const app = express();

// Security middleware
app.use(helmet());

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

// Logging middleware
if (envVars.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Register routes
app.use("/api", rootRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      stack: envVars.NODE_ENV === "development" ? err.stack : undefined,
    });
    return;
  }

  logger.error("[Express] Unhandled error:", err);

  res.status(500).json({
    code: 500,
    message: envVars.NODE_ENV === "development" ? err.message : "Internal server error",
    stack: envVars.NODE_ENV === "development" ? err.stack : undefined,
  });
  return;
});

export default app;
