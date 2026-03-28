import { Request, Response } from 'express';
import { z } from 'zod';
import multiAgentOrchestratorService from '@/services/orchestration/multi-agent-orchestrator.service.js';
import logger from '@/config/logger.js';
import catchAsync from '@/handlers/async.handler.js';
import { sendSuccess } from '@/utils/response.js';
import { APIError } from '@/utils/errors.js';

const querySchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional()
});

class MultiAgentController {
  /**
   * Initialize multi-agent system
   */
  initializeSystem = catchAsync(async (req: Request, res: Response) => {
    logger.info('[MultiAgentController] Initialize request received');
    await multiAgentOrchestratorService.initialize();
    sendSuccess(res, { timestamp: new Date() }, 'Multi-agent system initialized successfully');
  });

  /**
   * Get system statistics
   */
  getSystemStats = catchAsync(async (req: Request, res: Response) => {
    const stats = multiAgentOrchestratorService.getStats();
    sendSuccess(res, { stats, timestamp: new Date() });
  });

  /**
   * Get agent statuses
   */
  getAgentStatuses = catchAsync(async (req: Request, res: Response) => {
    const statuses = multiAgentOrchestratorService.getAllAgentStatuses();
    sendSuccess(res, { statuses, timestamp: new Date() });
  });

  /**
   * Handle user query
   */
  handleQuery = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) throw APIError.badRequest("Invalid query parameters");

    const { query, sessionId } = parsed.data;
    logger.info('[MultiAgentController] Query received', { query, userId });

    const result = await multiAgentOrchestratorService.handleUserQuery(
      query,
      userId,
      sessionId
    );

    sendSuccess(res, { result, timestamp: new Date() });
  });

  /**
   * Get pending alerts
   */
  getPendingAlerts = catchAsync(async (req: Request, res: Response) => {
    const alerts = multiAgentOrchestratorService.getPendingAlerts();
    sendSuccess(res, { alerts, count: alerts.length, timestamp: new Date() });
  });

  /**
   * Get message history
   */
  getMessageHistory = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const messages = multiAgentOrchestratorService.getMessageHistory(limit);
    sendSuccess(res, { messages, count: messages.length, timestamp: new Date() });
  });

  /**
   * Get shared state
   */
  getSharedState = catchAsync(async (req: Request, res: Response) => {
    const state = multiAgentOrchestratorService.getSharedState();
    sendSuccess(res, { state, timestamp: new Date() });
  });

  /**
   * Shutdown system
   */
  shutdownSystem = catchAsync(async (req: Request, res: Response) => {
    logger.info('[MultiAgentController] Shutdown request received');
    await multiAgentOrchestratorService.shutdown();
    sendSuccess(res, { timestamp: new Date() }, 'Multi-agent system shut down successfully');
  });
}

export const multiAgentController = new MultiAgentController();
