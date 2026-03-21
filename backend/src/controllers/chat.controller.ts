import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import { APIError } from "@/utils/errors.js";
import orchestratorService from "@/services/orchestrator.service.js";
import sessionService from "@/services/session.service.js";
import logger from "@/config/logger.js";

/**
 * Main chat endpoint - All user interactions flow through orchestrator
 */
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw APIError.badRequest("Message is required and must be a non-empty string");
  }

  if (message.length > 10000) {
    throw APIError.badRequest("Message exceeds maximum length of 10000 characters");
  }

  // Extract userId from auth (placeholder for now - will be replaced with real auth)
  const userId = (req as any).user?.id || 'anonymous';

  logger.info('[Chat Controller] Processing message', { 
    userId, 
    sessionId: sessionId || 'new',
    messageLength: message.length,
    messagePreview: message.substring(0, 50)
  });

  // Step 1: Get or create session
  let currentSessionId = sessionId;
  let isNewSession = false;

  if (!currentSessionId) {
    // Create new session
    const title = sessionService.generateSessionTitle(message);
    const session = await sessionService.createSession({
      userId,
      title
    });
    currentSessionId = session.id;
    isNewSession = true;

    logger.info('[Chat Controller] New session created', { 
      sessionId: currentSessionId,
      userId 
    });
  } else {
    // Verify session exists and belongs to user
    const session = await sessionService.getSession(currentSessionId);
    if (!session) {
      throw APIError.notFound('Session not found');
    }
    if (session.userId !== userId) {
      throw APIError.forbidden('Access denied to this session');
    }
  }

  // Step 2: Store user message
  await sessionService.addMessage({
    sessionId: currentSessionId,
    role: 'user',
    content: message.trim()
  });

  // Step 3: Process through orchestrator (single entry point)
  const result = await orchestratorService.handleUserInput(
    message.trim(), 
    userId,
    currentSessionId
  );

  // Step 4: Store assistant response
  await sessionService.addMessage({
    sessionId: currentSessionId,
    role: 'assistant',
    content: result.output,
    intent: result.intent,
    metadata: {
      confidence: result.metadata.confidence,
      processingTimeMs: result.metadata.processingTimeMs,
      servicesUsed: result.metadata.servicesUsed,
      actions: result.actions
    }
  });

  logger.info('[Chat Controller] Message processed successfully', {
    userId,
    sessionId: currentSessionId,
    intent: result.intent,
    processingTimeMs: result.metadata.processingTimeMs
  });

  // Return standardized response with session info
  res.status(200).json({
    success: true,
    data: {
      ...result,
      sessionId: currentSessionId,
      isNewSession
    }
  });
});

/**
 * Get session history
 */
export const getSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = (req as any).user?.id || 'anonymous';

  logger.info('[Chat Controller] Fetching session', { sessionId, userId });

  const session = await sessionService.getSession(sessionId);

  if (!session) {
    throw APIError.notFound('Session not found');
  }

  if (session.userId !== userId) {
    throw APIError.forbidden('Access denied to this session');
  }

  res.status(200).json({
    success: true,
    data: session
  });
});

/**
 * Get user's sessions
 */
export const getUserSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || 'anonymous';
  const limit = parseInt(req.query.limit as string) || 20;

  logger.info('[Chat Controller] Fetching user sessions', { userId, limit });

  const sessions = await sessionService.getUserSessions(userId, limit);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      total: sessions.length
    }
  });
});

/**
 * Delete a session
 */
export const deleteSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = (req as any).user?.id || 'anonymous';

  logger.info('[Chat Controller] Deleting session', { sessionId, userId });

  const session = await sessionService.getSession(sessionId);

  if (!session) {
    throw APIError.notFound('Session not found');
  }

  if (session.userId !== userId) {
    throw APIError.forbidden('Access denied to this session');
  }

  await sessionService.deleteSession(sessionId);

  res.status(200).json({
    success: true,
    message: 'Session deleted successfully'
  });
});


