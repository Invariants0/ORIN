import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware.js";
import {
  startNotionMcpOAuth,
  handleNotionMcpOAuthCallback,
  getNotionMcpOAuthStatus,
  disconnectNotionMcpOAuth
} from "@/controllers/notion-mcp-oauth.controller.js";

const router = Router();

router.get("/start", authenticate, startNotionMcpOAuth);
router.get("/callback", handleNotionMcpOAuthCallback);
router.get("/status", authenticate, getNotionMcpOAuthStatus);
router.post("/disconnect", authenticate, disconnectNotionMcpOAuth);

export default router;
