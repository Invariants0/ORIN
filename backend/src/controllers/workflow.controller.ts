import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { workflowRepository } from '../services/workflow.repository';
import { workflowAgentService } from '../services/workflow-agent.service';
import { monitoringService } from '../services/monitoring.service';

class WorkflowController {
  /**
   * GET /api/workflows
   * Get all workflows with optional filters
   */
  async getWorkflows(req: Request, res: Response) {
    try {
      const { userId, sessionId, status, limit = '50' } = req.query;

      let workflows;

      if (userId) {
        workflows = await workflowRepository.getWorkflowsByUser(
          userId as string,
          parseInt(limit as string)
        );
      } else if (sessionId) {
        workflows = await workflowRepository.getWorkflowsBySession(sessionId as string);
      } else {
        // Get pending workflows if no filter
        workflows = await workflowRepository.getPendingWorkflows(
          parseInt(limit as string)
        );
      }

      // Filter by status if provided
      if (status) {
        workflows = workflows.filter(w => w.status === status);
      }

      // Enrich with metrics
      const enrichedWorkflows = workflows.map(workflow => {
        const metrics = monitoringService.getWorkflowMetrics(workflow.id);
        return {
          ...workflow,
          metrics
        };
      });

      res.json({
        success: true,
        data: enrichedWorkflows,
        count: enrichedWorkflows.length
      });
    } catch (error: any) {
      logger.error('Failed to get workflows:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/workflows/:id
   * Get workflow by ID with full details
   */
  async getWorkflowById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const workflow = await workflowRepository.getWorkflow(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      // Get metrics
      const metrics = monitoringService.getWorkflowMetrics(id);

      // Get results
      const results = await workflowRepository.getResults(id);

      res.json({
        success: true,
        data: {
          ...workflow,
          metrics,
          results
        }
      });
    } catch (error: any) {
      logger.error('Failed to get workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/workflows
   * Create a new workflow
   */
  async createWorkflow(req: Request, res: Response) {
    try {
      const { goal, userId, sessionId } = req.body;

      if (!goal || !userId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'goal, userId, and sessionId are required'
        });
      }

      const workflow = await workflowAgentService.planWorkflow(
        goal,
        userId,
        sessionId
      );

      res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (error: any) {
      logger.error('Failed to create workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/pause
   * Pause a running workflow
   */
  async pauseWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'Paused by user' } = req.body;

      const workflow = await workflowRepository.getWorkflow(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (workflow.status !== 'running') {
        return res.status(400).json({
          success: false,
          error: `Cannot pause workflow with status: ${workflow.status}`
        });
      }

      // Update workflow status
      await workflowRepository.updateWorkflow(id, {
        status: 'paused',
        pauseReason: reason
      });

      // Track event
      monitoringService.trackWorkflowPaused(id, reason);

      logger.info('Workflow paused', { workflowId: id, reason });

      res.json({
        success: true,
        message: 'Workflow paused successfully'
      });
    } catch (error: any) {
      logger.error('Failed to pause workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/resume
   * Resume a paused workflow
   */
  async resumeWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const workflow = await workflowRepository.getWorkflow(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (workflow.status !== 'paused') {
        return res.status(400).json({
          success: false,
          error: `Cannot resume workflow with status: ${workflow.status}`
        });
      }

      // Update workflow status back to running
      await workflowRepository.updateWorkflow(id, {
        status: 'running',
        pauseReason: null,
        lockedBy: null, // Release lock so worker can pick it up
        lockedAt: null
      });

      // Track event
      monitoringService.trackWorkflowStarted(id, workflow.steps.length);

      logger.info('Workflow resumed', { workflowId: id });

      res.json({
        success: true,
        message: 'Workflow resumed successfully'
      });
    } catch (error: any) {
      logger.error('Failed to resume workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/cancel
   * Cancel a workflow
   */
  async cancelWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason = 'Cancelled by user' } = req.body;

      const workflow = await workflowRepository.getWorkflow(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (workflow.status === 'completed' || workflow.status === 'failed') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel workflow with status: ${workflow.status}`
        });
      }

      // Update workflow status
      await workflowRepository.updateWorkflow(id, {
        status: 'failed',
        pauseReason: reason,
        completedAt: new Date(),
        lockedBy: null,
        lockedAt: null
      });

      // Track event
      monitoringService.trackWorkflowFailed(id, reason);

      logger.info('Workflow cancelled', { workflowId: id, reason });

      res.json({
        success: true,
        message: 'Workflow cancelled successfully'
      });
    } catch (error: any) {
      logger.error('Failed to cancel workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/workflows/statistics
   * Get workflow statistics
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      const stats = await workflowRepository.getStatistics(userId as string);
      const systemMetrics = await monitoringService.getSystemMetrics();

      res.json({
        success: true,
        data: {
          ...stats,
          systemMetrics
        }
      });
    } catch (error: any) {
      logger.error('Failed to get statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/workflows/metrics
   * Get all workflow metrics
   */
  async getMetrics(req: Request, res: Response) {
    try {
      const metrics = monitoringService.getAllWorkflowMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      logger.error('Failed to get metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/workflows/alerts
   * Get recent alerts
   */
  async getAlerts(req: Request, res: Response) {
    try {
      const { limit = '50' } = req.query;

      const alerts = monitoringService.getAlerts(parseInt(limit as string));

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error: any) {
      logger.error('Failed to get alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/workflows/alerts
   * Clear all alerts
   */
  async clearAlerts(req: Request, res: Response) {
    try {
      monitoringService.clearAlerts();

      res.json({
        success: true,
        message: 'Alerts cleared successfully'
      });
    } catch (error: any) {
      logger.error('Failed to clear alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const workflowController = new WorkflowController();
