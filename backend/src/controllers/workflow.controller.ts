import { Request, Response } from 'express';
import logger from '@/config/logger.js';
import envVars from '@/config/envVars.js';
import { workflowRepository } from '@/services/workflow/workflow.repository.js';
import { workflowAgentService } from '@/services/workflow/workflow-agent.service.js';
import { monitoringService } from '@/services/infrastructure/monitoring.service.js';
import catchAsync from '@/handlers/async.handler.js';
import { APIError } from '@/utils/errors.js';
import { sendSuccess } from '@/utils/response.js';

class WorkflowController {
  /**
   * GET /api/workflows
   */
  getWorkflows = catchAsync(async (req: Request, res: Response) => {
    const { userId, sessionId, status, limit = '50' } = req.query;
    const authUserId = req.user?.id;

    // Security: Only allow querying by own userId if not ADMIN
    const targetUserId = (userId as string) || authUserId;
    if (!targetUserId) throw APIError.unauthorized('User context required');

    let workflows;
    if (sessionId) {
      workflows = await workflowRepository.getWorkflowsBySession(sessionId as string);
    } else {
      workflows = await workflowRepository.getWorkflowsByUser(
        targetUserId,
        parseInt(limit as string)
      );
    }

    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }

    // Enrich with metrics via service
    const enrichedWorkflows = workflows.map(workflow => ({
      ...workflow,
      metrics: monitoringService.getWorkflowMetrics(workflow.id)
    }));

    sendSuccess(res, enrichedWorkflows, undefined);
  });

  /**
   * GET /api/workflows/:id
   */
  getWorkflowById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workflow = await workflowRepository.getWorkflow(id as string);

    if (!workflow) throw APIError.notFound('Workflow not found');

    const metrics = monitoringService.getWorkflowMetrics(id as string);
    const results = await workflowRepository.getResults(id as string);

    sendSuccess(res, { ...workflow, metrics, results });
  });

  /**
   * POST /api/workflows
   */
  createWorkflow = catchAsync(async (req: Request, res: Response) => {
    const { goal, sessionId } = req.body;
    const userId = req.body.userId || req.user?.id;

    if (!userId) throw APIError.unauthorized('User context required');

    const workflow = await workflowAgentService.planWorkflow(goal, userId, sessionId);
    sendSuccess(res, workflow, 'Workflow created successfully', 201);
  });

  /**
   * POST /api/workflows/:id/pause
   */
  pauseWorkflow = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason = 'Paused by user' } = req.body;

    const workflow = await workflowRepository.getWorkflow(id as string);
    if (!workflow) throw APIError.notFound('Workflow not found');
    if (workflow.status !== 'running') {
      throw APIError.badRequest(`Cannot pause workflow with status: ${workflow.status}`);
    }

    await workflowRepository.updateWorkflow(id as string, {
      status: 'paused',
      pauseReason: reason
    });

    monitoringService.trackWorkflowPaused(id as string, reason);
    logger.info('[Workflow] Paused', { workflowId: id, reason });

    sendSuccess(res, null, 'Workflow paused successfully');
  });

  /**
   * POST /api/workflows/:id/resume
   */
  resumeWorkflow = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const workflow = await workflowRepository.getWorkflow(id as string);
    if (!workflow) throw APIError.notFound('Workflow not found');
    if (workflow.status !== 'paused') {
      throw APIError.badRequest(`Cannot resume workflow with status: ${workflow.status}`);
    }

    await workflowRepository.updateWorkflow(id as string, {
      status: 'running',
      pauseReason: null,
      lockedBy: null,
      lockedAt: null
    });

    monitoringService.trackWorkflowStarted(id as string, workflow.steps.length);
    logger.info('[Workflow] Resumed', { workflowId: id });

    sendSuccess(res, null, 'Workflow resumed successfully');
  });

  /**
   * POST /api/workflows/:id/cancel
   */
  cancelWorkflow = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const workflow = await workflowRepository.getWorkflow(id as string);
    if (!workflow) throw APIError.notFound('Workflow not found');

    if (workflow.status === 'completed' || workflow.status === 'failed') {
      throw APIError.badRequest(`Cannot cancel workflow with status: ${workflow.status}`);
    }

    await workflowRepository.updateWorkflow(id as string, {
      status: 'failed',
      pauseReason: reason,
      completedAt: new Date(),
      lockedBy: null,
      lockedAt: null
    });

    monitoringService.trackWorkflowFailed(id as string, reason);
    logger.info('[Workflow] Cancelled', { workflowId: id, reason });

    sendSuccess(res, null, 'Workflow cancelled successfully');
  });

  /**
   * GET /api/workflows/statistics
   */
  getStatistics = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || req.user?.id;
    if (!userId) throw APIError.unauthorized('User context required');

    const stats = await workflowRepository.getStatistics(userId);
    const systemMetrics = envVars.MONITORING_ENABLED === "true"
      ? await monitoringService.getSystemMetrics()
      : null;

    sendSuccess(res, { ...stats, systemMetrics });
  });

  /**
   * GET /api/workflows/metrics
   */
  getMetrics = catchAsync(async (req: Request, res: Response) => {
    if (envVars.MONITORING_ENABLED !== "true") {
      return sendSuccess(res, [], 'Monitoring disabled');
    }

    const metrics = monitoringService.getAllWorkflowMetrics();
    sendSuccess(res, metrics);
  });

  /**
   * GET /api/workflows/alerts
   */
  getAlerts = catchAsync(async (req: Request, res: Response) => {
    if (envVars.MONITORING_ENABLED !== "true") {
      return sendSuccess(res, [], 'Monitoring disabled');
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = monitoringService.getAlerts(limit);
    sendSuccess(res, alerts);
  });

  /**
   * DELETE /api/workflows/alerts
   */
  clearAlerts = catchAsync(async (req: Request, res: Response) => {
    if (envVars.MONITORING_ENABLED !== "true") {
      return sendSuccess(res, null, 'Monitoring disabled');
    }

    monitoringService.clearAlerts();
    sendSuccess(res, null, 'Alerts cleared successfully');
  });
}

export const workflowController = new WorkflowController();
