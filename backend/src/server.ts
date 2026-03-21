import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import app from "./app.js";
import db from "./config/database.js";
import envVars from "./config/envVars.js";
import logger from "./config/logger.js";

async function startServer() {
  try {
    await db.$connect();
    logger.info("[Prisma] Database connection established.");

    const PORT = envVars.PORT;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 ORIN Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${envVars.NODE_ENV}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
    });

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received: closing server and DB connection...");
      server.close(async () => {
        await db.$disconnect();
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received: closing server and DB connection...");
      server.close(async () => {
        await db.$disconnect();
        process.exit(0);
      });
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

