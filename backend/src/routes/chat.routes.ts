import { Router } from "express";
import * as chatController from "@/controllers/chat.controller.js";

const router = Router();

// Store endpoint - Save content to Notion
router.post("/store", chatController.store);

// Retrieve endpoint - Query and analyze context
router.post("/retrieve", chatController.retrieve);

// Generate document endpoint
router.post("/generate-doc", chatController.generateDoc);

export default router;
