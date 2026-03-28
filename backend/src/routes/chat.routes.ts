import { Router } from "express";
import { sendMessage, getSession, getUserSessions, deleteSession } from "@/controllers/chat.controller.js";
import { authenticate } from "@/middlewares/auth.middleware.js";
import { validate } from "@/middlewares/validate.middleware.js";
import { sendMessageSchema } from "@/schemas/chat.schema.js";

const router = Router();
router.use(authenticate);

/**
 * Main chat endpoint - All user interactions flow through orchestrator
 * POST /api/v1/message
 * 
 * Body: { 
 *   "message": "user input",
 *   "sessionId": "optional-session-id"
 * }
 * 
 * Response: {
 *   "success": true,
 *   "data": {
 *     "intent": "STORE|QUERY|GENERATE_DOC|OPERATE|UNCLEAR",
 *     "output": "human-readable response",
 *     "references": ["url1", "url2"],
 *     "actions": [{ type, status, details }],
 *     "metadata": { processingTimeMs, confidence, servicesUsed },
 *     "sessionId": "session-id",
 *     "isNewSession": true|false
 *   }
 * }
 */
router.post("/message", validate(sendMessageSchema), sendMessage);

/**
 * Get session history
 * GET /api/v1/sessions/:sessionId
 */
router.get("/sessions/:sessionId", getSession);

/**
 * Get user's sessions
 * GET /api/v1/sessions
 */
router.get("/sessions", getUserSessions);

/**
 * Delete a session
 * DELETE /api/v1/sessions/:sessionId
 */
router.delete("/sessions/:sessionId", deleteSession);

export default router;
