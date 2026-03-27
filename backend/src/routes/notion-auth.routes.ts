import { Router } from "express";
import {
  startNotionOAuth,
  handleNotionOAuthCallback,
  getNotionOAuthStatus,
  disconnectNotionOAuth
} from "@/controllers/notion-oauth.controller.js";
import { authenticate } from "@/middlewares/auth.middleware.js";

const router = Router();

router.get("/start", authenticate, startNotionOAuth);
router.get("/callback", handleNotionOAuthCallback);
router.get("/status", authenticate, getNotionOAuthStatus);
router.post("/disconnect", authenticate, disconnectNotionOAuth);

export default router;
