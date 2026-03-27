import { PrismaClient } from '@prisma/client';
import logger from '@/config/logger.js';

const prisma = new PrismaClient();

interface CreateWorkflowData {
  userId: string;
  sessionId: string;
  goal: string;
  steps: Array<{
    stepId: string;
    name: string;
    action: string;
    parameters: any;
    dependencies: string[];
    riskLevel: string;
    estimatedDuration: number;
    retryable: boolean;
    maxRetries: number;
  }>;
  metadata?: any;
}

interface UpdateWorkflowData {
  status?: string;
  currentStep?: string | null;
  pauseReason?: string | null;
  startedAt?: Date;
  completedAt?: Date;
  lockedBy?: string | null;
  lockedAt?: Date | null;
}

interface UpdateStepData {
  status?: string;
  attempts?: number;
  error?: string | null;
  output?: any;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date | null;
}

class WorkflowRepository {
  /**
   * Create a new workflow with steps
   */
  async createWorkflow(data: CreateWorkflowData) {
    try {
      const workflow = await prisma.workflow.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          goal: data.goal,
          status: 'pending',
          metadata: data.metadata || {},
          steps: {
            create: data.steps.map(step => ({
              stepId: step.stepId,
              name: step.name,
              action: step.action,
              parameters: step.parameters,
              dependencies: step.dependencies,
              riskLevel: step.riskLevel,
              estimatedDuration: step.estimatedDuration,
              retryable: step.retryable,
              maxRetries: step.maxRetries,
              status: 'pending'
            }))
          }
        },
        include: {
          steps: true
        }
      });

      logger.info('Workflow created', { workflowId: workflow.id });
      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID with steps and results
   */
  async getWorkflow(workflowId: string) {
    return await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { createdAt: 'asc' }
        },
        results: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId: string, data: UpdateWorkflowData) {
    return await prisma.workflow.update({
      where: { id: workflowId },
      data
    });
  }

  /**
   * Update workflow step
   */
  async updateStep(workflowId: string, stepId: string, data: UpdateStepData) {
    return await prisma.workflowStep.update({
      where: {
        workflowId_stepId: {
          workflowId,
          stepId
        }
      },
      data
    });
  }

  /**
   * Store step result
   */
  async storeResult(workflowId: string, stepId: string, output: any) {
    return await prisma.workflowResult.create({
      data: {
        workflowId,
        stepId,
        output
      }
    });
  }

  /**
   * Get pending workflows (not locked, status = pending or running)
   */
  async getPendingWorkflows(limit: number = 10) {
    const now = new Date();
    const lockTimeout = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes

    return await prisma.workflow.findMany({
      where: {
        status: {
          in: ['pending', 'running']
        },
        OR: [
          { lockedBy: null },
          { lockedAt: { lt: lockTimeout } } // Lock expired
        ]
      },
      include: {
        steps: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit
    });
  }

  /**
   * Lock workflow for execution (distributed lock)
   */
  async lockWorkflow(workflowId: string, workerId: string): Promise<boolean> {
    try {
      const now = new Date();
      const lockTimeout = new Date(now.getTime() - 5 * 60 * 1000);

      const result = await prisma.workflow.updateMany({
        where: {
          id: workflowId,
          OR: [
            { lockedBy: null },
            { lockedAt: { lt: lockTimeout } }
          ]
        },
        data: {
          lockedBy: workerId,
          lockedAt: now
        }
      });

      return result.count > 0;
    } catch (error) {
      logger.error('Failed to lock workflow:', error);
      return false;
    }
  }

  /**
   * Release workflow lock
   */
  async unlockWorkflow(workflowId: string, workerId: string) {
    await prisma.workflow.updateMany({
      where: {
        id: workflowId,
        lockedBy: workerId
      },
      data: {
        lockedBy: null,
        lockedAt: null
      }
    });
  }

  /**
   * Get workflows by user
   */
  async getWorkflowsByUser(userId: string, limit: number = 50) {
    return await prisma.workflow.findMany({
      where: { userId },
      include: {
        steps: {
          select: {
            stepId: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Get workflows by session
   */
  async getWorkflowsBySession(sessionId: string) {
    return await prisma.workflow.findMany({
      where: { sessionId },
      include: {
        steps: true,
        results: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get step by workflow and step ID
   */
  async getStep(workflowId: string, stepId: string) {
    return await prisma.workflowStep.findUnique({
      where: {
        workflowId_stepId: {
          workflowId,
          stepId
        }
      }
    });
  }

  /**
   * Get all results for a workflow
   */
  async getResults(workflowId: string) {
    return await prisma.workflowResult.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Add step to retry queue
   */
  async addToQueue(workflowId: string, stepId: string, priority: number = 0, retryCount: number = 0) {
    return await prisma.workflowQueue.create({
      data: {
        workflowId,
        stepId,
        priority,
        retryCount,
        scheduledAt: new Date()
      }
    });
  }

  /**
   * Get next queued item
   */
  async getNextQueuedItem() {
    const items = await prisma.workflowQueue.findMany({
      where: {
        scheduledAt: {
          lte: new Date()
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledAt: 'asc' }
      ],
      take: 1
    });

    return items[0] || null;
  }

  /**
   * Remove from queue
   */
  async removeFromQueue(queueId: string) {
    await prisma.workflowQueue.delete({
      where: { id: queueId }
    });
  }

  /**
   * Get timed out steps
   */
  async getTimedOutSteps() {
    return await prisma.workflowStep.findMany({
      where: {
        status: 'running',
        timeoutAt: {
          lte: new Date()
        }
      },
      include: {
        workflow: true
      }
    });
  }

  /**
   * Clean up old completed workflows
   */
  async cleanupOldWorkflows(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.workflow.deleteMany({
      where: {
        status: 'completed',
        completedAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info('Cleaned up old workflows', { count: result.count });
    return result.count;
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, pending, running, completed, failed] = await Promise.all([
      prisma.workflow.count({ where }),
      prisma.workflow.count({ where: { ...where, status: 'pending' } }),
      prisma.workflow.count({ where: { ...where, status: 'running' } }),
      prisma.workflow.count({ where: { ...where, status: 'completed' } }),
      prisma.workflow.count({ where: { ...where, status: 'failed' } })
    ]);

    return {
      total,
      pending,
      running,
      completed,
      failed
    };
  }
}

export const workflowRepository = new WorkflowRepository();
