import { Router } from "express";
import db from "@/config/database.js";
import envVars from "@/config/envVars.js";

const router = Router();

// Health check endpoint (checks system dependencies)
router.get("/", async (req, res) => {
  const checks: Record<string, any> = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: envVars.NODE_ENV,
    requestId: (req as any).requestId,
  };

  try {
    // 1. Database Check
    await db.$queryRaw`SELECT 1`;
    checks.database = "connected";

    // 2. AI Service Check
    checks.ai_service = envVars.GEMINI_API_KEY ? "configured" : "missing";

    // 3. Notion Check (Config level)
    checks.notion = {
      rest: envVars.NOTION_OAUTH_CLIENT_ID ? "configured" : "missing",
      mcp: envVars.NOTION_MCP_TOKEN ? "fixed-mcp-active" : (envVars.NOTION_OAUTH_CLIENT_ID ? "oauth-mcp-enabled" : "missing")
    };

    res.status(200).json({
      status: "success",
      message: "ORIN API is operational",
      data: checks
    });
  } catch (err: any) {
    res.status(503).json({
      status: "error",
      message: "ORIN API is experiencing issues",
      error: envVars.NODE_ENV === "development" ? err.message : "Service degradation",
      data: checks
    });
  }
});

export default router;
