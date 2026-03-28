import { Request, Response } from "express";
import catchAsync from "@/handlers/async.handler.js";
import { APIError } from "@/utils/errors.js";
import orchestratorService from "@/services/orchestration/orchestrator.service.js";
import sessionService from "@/services/infrastructure/session.service.js";
import logger from "@/config/logger.js";
import { sendSuccess } from "@/utils/response.js";

/**
 * Main chat endpoint - Production Graded
 * Logic:
 * 1. Derives secure context (userId, sessionId)
 * 2. Persists User/Assistant messages
 * 3. Bridges to AI Orchestrator
 */
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;
  const userId = req.user!.id; // Non-null check safe due to authenticate middleware

  logger.info('[Chat Controller] Processing message', { userId, sessionId });

  // 1. Context initialization
  let currentSessionId = sessionId;
  let isNewSession = false;

  if (!currentSessionId) {
    const title = sessionService.generateSessionTitle(message);
    const session = await sessionService.createSession({ userId, title });
    currentSessionId = session.id;
    isNewSession = true;
  } else {
    const session = await sessionService.getSession(currentSessionId);
    if (!session) throw APIError.notFound('Session not found');
    if (session.userId !== userId) throw APIError.forbidden('Access denied');
  }

  // 2. Persist user input
  await sessionService.addMessage({
    sessionId: currentSessionId as string,
    role: 'user',
    content: (message as string).trim()
  });

  // 3. AI Execution (Centralized Orchestrator)
  const result = await orchestratorService.handleUserInput((message as string).trim(), userId, currentSessionId as string);

  // 4. Persist assistant output
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

  // 5. Standardized response
  sendSuccess(res, {
    ...result,
    sessionId: currentSessionId,
    isNewSession
  }, "Message processed successfully");
});

export const getSession = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const userId = req.user!.id;

  const session = await sessionService.getSession(sessionId);
  if (!session) throw APIError.notFound('Session not found');
  if (session.userId !== userId) throw APIError.forbidden('Access denied');

  sendSuccess(res, session);
});

export const getUserSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const sessions = await sessionService.getUserSessions(userId, limit);
  sendSuccess(res, { sessions, total: sessions.length });
});

export const deleteSession = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const userId = req.user!.id;

  const session = await sessionService.getSession(sessionId);
  if (!session) throw APIError.notFound('Session not found');
  if (session.userId !== userId) throw APIError.forbidden('Access denied');

  await sessionService.deleteSession(sessionId);
  sendSuccess(res, null, 'Session deleted successfully');
});
