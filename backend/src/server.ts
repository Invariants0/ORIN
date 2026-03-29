import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Fix for BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import app from "@/app.js";
import db from "@/config/database.js";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import { websocketGateway } from "@/services/infrastructure/websocket.gateway.js";
import { monitoringService } from "@/services/infrastructure/monitoring.service.js";
import { workflowRunnerService } from "@/services/workflow/workflow-runner.service.js";

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

    // Production-Grade Connection Hardening
    server.timeout = 180000; // 3 minutes for deep AI operations
    server.keepAliveTimeout = 70000; // Higher than proxy timeouts (60s)
    server.headersTimeout = 71000;

    // Initialize WebSocket server
    websocketGateway.initialize(server);
    logger.info('✅ WebSocket server initialized');

    // Start monitoring service (optional)
    if (envVars.MONITORING_ENABLED === "true") {
      monitoringService.start();
      logger.info('✅ Monitoring service started');
    } else {
      logger.info('⚠️ Monitoring service disabled');
    }

    // Start workflow runner
    workflowRunnerService.start();
    logger.info('✅ Workflow runner started');

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received: closing server and DB connection...");
      server.close(async () => {
        websocketGateway.shutdown();
        if (envVars.MONITORING_ENABLED === "true") {
          monitoringService.stop();
        }
        workflowRunnerService.stop();
        await db.$disconnect();
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received: closing server and DB connection...");
      server.close(async () => {
        websocketGateway.shutdown();
        if (envVars.MONITORING_ENABLED === "true") {
          monitoringService.stop();
        }
        workflowRunnerService.stop();
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
