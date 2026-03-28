import { Router } from "express";
import { notionAuthController } from "@/controllers/notion-auth.controller.js";
import { notionStatusController } from "@/controllers/notion-status.controller.js";
import { authenticate } from "@/middlewares/auth.middleware.js";

const router = Router();

// REST OAuth flow
router.get("/rest/start", authenticate, notionAuthController.startRestOAuth);
router.get("/rest/callback", notionAuthController.handleRestCallback);
// Aliases for compatibility
router.get("/oauth/start", authenticate, notionAuthController.startRestOAuth);
router.get("/oauth/callback", notionAuthController.handleRestCallback);

// MCP OAuth flow
router.get("/mcp/start", authenticate, notionAuthController.startMcpOAuth);
router.get("/mcp/callback", notionAuthController.handleMcpCallback);
// Aliases for compatibility
router.get("/mcp/oauth/start", authenticate, notionAuthController.startMcpOAuth);
router.get("/mcp/oauth/callback", notionAuthController.handleMcpCallback);

// --- Connection Management ---
router.get("/status", authenticate, notionAuthController.getStatus);
router.delete("/disconnect", authenticate, notionAuthController.disconnectAll);

// --- Integration Health & Info ---
router.get("/health", authenticate, notionStatusController.checkHealth);
router.get("/instructions", notionStatusController.getInstructions);

export default router;
