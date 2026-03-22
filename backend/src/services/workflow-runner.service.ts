import logger from '../config/logger.js';
import { workflowRepository } from './workflow.repository.js';
import { geminiService } from './gemini.service.js';
import { agentService } from './agent.service.js';
import { monitoringService } from './monitoring.service.js';
import crypto from 'crypto';

interface StepExecutionContext {
  workflowId: string;
  stepId: string;
  parameters: any;
  dependencies: Record<string, any>;
  startTime: number;
}

interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
}

class WorkflowRunnerService {
  private workerId: string;
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5000; // 5 seconds
  private readonly STEP_TIMEOUT_MS = 300000; // 5 minutes
  private readonly MAX_CONCURRENT_WORKFLOWS = 5;
  private activeWorkflows: Set<string> = new Set();

  constructor() {
    this.workerId = this.generateWorkerId();
  }

  /**
   * Start the workflow runner
   */
  start() {
    if (this.isRunning) {
      logger.warn('Workflow runner already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting workflow runner', { workerId: this.workerId });

    // Start polling for workflows
    this.pollingInterval = setInterval(() => {
      this.pollAndExecute();
    }, this.POLL_INTERVAL_MS);

    // Start timeout monitor
    this.startTimeoutMonitor();

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Stop the workflow runner
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping workflow runner', { workerId: this.workerId });

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll for pending workflows and execute them
   */
  private async pollAndExecute() {
    if (this.activeWorkflows.size >= this.MAX_CONCURRENT_WORKFLOWS) {
      return;
    }

    try {
      const availableSlots = this.MAX_CONCURRENT_WORKFLOWS - this.activeWorkflows.size;
      const workflows = await workflowRepository.getPendingWorkflows(availableSlots);

      for (const workflow of workflows) {
        // Try to acquire lock
        const locked = await workflowRepository.lockWorkflow(workflow.id, this.workerId);
        
        if (locked) {
          this.activeWorkflows.add(workflow.id);
          
          // Execute workflow asynchronously
          this.executeWorkflow(workflow.id)
            .finally(() => {
              this.activeWorkflows.delete(workflow.id);
            });
        }
      }
    } catch (error) {
      logger.error('Error polling workflows:', error);
    }
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(workflowId: string) {
    try {
      logger.info('Executing workflow', { workflowId, workerId: this.workerId });

      const workflow = await workflowRepository.getWorkflow(workflowId);
      if (!workflow) {
        logger.error('Workflow not found', { workflowId });
        return;
      }

      // Update status to running
      await workflowRepository.updateWorkflow(workflowId, {
        status: 'running',
        startedAt: new Date()
      });

      // Track workflow started
      monitoringService.trackWorkflowStarted(workflowId, workflow.steps.length);

      // Get execution order
      const executionOrder = this.resolveExecutionOrder(workflow.steps);

      // Get existing results
      const results = await workflowRepository.getResults(workflowId);
      const resultMap = results.reduce((acc, r) => {
        acc[r.stepId] = r.output;
        return acc;
      }, {} as Record<string, any>);

      // Execute steps
      for (const step of executionOrder) {
        // Skip if already completed
        if (step.status === 'completed') {
          continue;
        }

        // Check dependencies
        const dependenciesMet = step.dependencies.every((depId: string) =>
          resultMap[depId] !== undefined
        );

        if (!dependenciesMet) {
          logger.warn('Dependencies not met', { workflowId, stepId: step.stepId });
          continue;
        }

        // Update current step
        await workflowRepository.updateWorkflow(workflowId, {
          currentStep: step.stepId
        });

        // Check if should pause
        const shouldPause = await this.shouldPauseBeforeStep(step, workflow);
        if (shouldPause.pause) {
          await workflowRepository.updateWorkflow(workflowId, {
            status: 'paused',
            pauseReason: shouldPause.reason
          });
          logger.info('Workflow paused', { workflowId, reason: shouldPause.reason });
          return;
        }

        // Execute step with idempotency check
        const executed = await this.executeStepIdempotent(
          workflowId,
          step,
          resultMap
        );

        if (!executed.success) {
          // Handle failure
          await this.handleStepFailure(workflowId, step, executed.error);
          
          // Check if should abort
          if (!step.retryable || step.attempts >= step.maxRetries) {
            await workflowRepository.updateWorkflow(workflowId, {
              status: 'failed'
            });
            logger.error('Workflow failed', { workflowId, stepId: step.stepId });
            return;
          }
        } else {
          // Store result
          resultMap[step.stepId] = executed.output;
        }
      }

      // Workflow completed
      await workflowRepository.updateWorkflow(workflowId, {
        status: 'completed',
        completedAt: new Date(),
        currentStep: null
      });

      const duration = Date.now() - workflow.startedAt!.getTime();
      monitoringService.trackWorkflowCompleted(workflowId, duration);

      logger.info('Workflow completed', { workflowId });
    } catch (error) {
      logger.error('Workflow execution error:', error);
      await workflowRepository.updateWorkflow(workflowId, {
        status: 'failed'
      });
      monitoringService.trackWorkflowFailed(workflowId, (error as Error).message);
    } finally {
      // Release lock
      await workflowRepository.unlockWorkflow(workflowId, this.workerId);
    }
  }

  /**
   * Execute step with idempotency guarantee
   */
  private async executeStepIdempotent(
    workflowId: string,
    step: any,
    dependencies: Record<string, any>
  ): Promise<ExecutionResult> {
    try {
      // Check if already completed (idempotency)
      const currentStep = await workflowRepository.getStep(workflowId, step.stepId);
      if (currentStep?.status === 'completed' && currentStep.output) {
        logger.info('Step already completed (idempotent)', {
          workflowId,
          stepId: step.stepId
        });
        return {
          success: true,
          output: currentStep.output
        };
      }

      // Update step status to running
      const timeoutAt = new Date(Date.now() + this.STEP_TIMEOUT_MS);
      await workflowRepository.updateStep(workflowId, step.stepId, {
        status: 'running',
        startedAt: new Date(),
        timeoutAt,
        attempts: step.attempts + 1
      });

      // Track step started
      monitoringService.trackStepStarted(workflowId, step.stepId, step.name);

      // Execute step
      const context: StepExecutionContext = {
        workflowId,
        stepId: step.stepId,
        parameters: step.parameters,
        dependencies,
        startTime: Date.now()
      };

      const result = await this.executeStepAction(step.action, context);

      const duration = Date.now() - context.startTime;

      // Update step status to completed
      await workflowRepository.updateStep(workflowId, step.stepId, {
        status: 'completed',
        completedAt: new Date(),
        output: result,
        timeoutAt: null
      });

      // Store result
      await workflowRepository.storeResult(workflowId, step.stepId, result);

      // Track step completed
      monitoringService.trackStepCompleted(workflowId, step.stepId, duration, result);

      logger.info('Step completed', { workflowId, stepId: step.stepId });

      return {
        success: true,
        output: result
      };
    } catch (error: any) {
      logger.error('Step execution failed:', error);

      await workflowRepository.updateStep(workflowId, step.stepId, {
        status: 'failed',
        error: error.message,
        timeoutAt: null
      });

      // Track step failed
      monitoringService.trackStepFailed(workflowId, step.stepId, error.message, step.attempts + 1);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute step action based on type
   */
  private async executeStepAction(
    action: string,
    context: StepExecutionContext
  ): Promise<any> {
    switch (action) {
      case 'fetch_data':
        return await this.executeFetchData(context);
      case 'process_data':
        return await this.executeProcessData(context);
      case 'validate':
        return await this.executeValidate(context);
      case 'transform':
        return await this.executeTransform(context);
      case 'store':
        return await this.executeStore(context);
      case 'call_api':
        return await this.executeCallApi(context);
      case 'analyze':
        return await this.executeAnalyze(context);
      default:
        throw new Error(`Unknown action type: ${action}`);
    }
  }

  /**
   * Handle step failure
   */
  private async handleStepFailure(
    workflowId: string,
    step: any,
    error?: string
  ) {
    logger.warn('Handling step failure', {
      workflowId,
      stepId: step.stepId,
      attempts: step.attempts
    });

    if (step.retryable && step.attempts < step.maxRetries) {
      // Add to retry queue
      const delay = this.calculateRetryDelay(step.attempts);
      const scheduledAt = new Date(Date.now() + delay);
      
      await workflowRepository.addToQueue(
        workflowId,
        step.stepId,
        0,
        step.attempts
      );

      logger.info('Step queued for retry', {
        workflowId,
        stepId: step.stepId,
        retryCount: step.attempts
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempts: number): number {
    return Math.min(1000 * Math.pow(2, attempts), 60000); // Max 1 minute
  }

  /**
   * Check if should pause before step
   */
  private async shouldPauseBeforeStep(
    step: any,
    workflow: any
  ): Promise<{ pause: boolean; reason?: string }> {
    if (step.riskLevel === 'high') {
      return {
        pause: true,
        reason: `High-risk operation: ${step.name}. User approval required.`
      };
    }

    return { pause: false };
  }

  /**
   * Resolve execution order (topological sort)
   */
  private resolveExecutionOrder(steps: any[]): any[] {
    const ordered: any[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: any) => {
      if (visited.has(step.stepId)) return;
      if (visiting.has(step.stepId)) {
        throw new Error(`Circular dependency detected: ${step.stepId}`);
      }

      visiting.add(step.stepId);

      for (const depId of step.dependencies) {
        const depStep = steps.find(s => s.stepId === depId);
        if (depStep) {
          visit(depStep);
        }
      }

      visiting.delete(step.stepId);
      visited.add(step.stepId);
      ordered.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return ordered;
  }

  /**
   * Start timeout monitor
   */
  private startTimeoutMonitor() {
    setInterval(async () => {
      try {
        const timedOutSteps = await workflowRepository.getTimedOutSteps();

        for (const step of timedOutSteps) {
          logger.warn('Step timed out', {
            workflowId: step.workflowId,
            stepId: step.stepId
          });

          await workflowRepository.updateStep(step.workflowId, step.stepId, {
            status: 'failed',
            error: 'Step execution timed out',
            timeoutAt: null
          });

          // Track timeout
          monitoringService.trackStepTimeout(step.workflowId, step.stepId);

          // Add to retry queue if retryable
          if (step.retryable && step.attempts < step.maxRetries) {
            await workflowRepository.addToQueue(
              step.workflowId,
              step.stepId,
              1, // Higher priority for timeouts
              step.attempts
            );
          }
        }
      } catch (error) {
        logger.error('Timeout monitor error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor() {
    setInterval(async () => {
      try {
        const queueItem = await workflowRepository.getNextQueuedItem();
        
        if (queueItem) {
          logger.info('Processing queued item', {
            workflowId: queueItem.workflowId,
            stepId: queueItem.stepId
          });

          // Remove from queue
          await workflowRepository.removeFromQueue(queueItem.id);

          // Trigger workflow execution
          const locked = await workflowRepository.lockWorkflow(
            queueItem.workflowId,
            this.workerId
          );

          if (locked) {
            this.activeWorkflows.add(queueItem.workflowId);
            this.executeWorkflow(queueItem.workflowId)
              .finally(() => {
                this.activeWorkflows.delete(queueItem.workflowId);
              });
          }
        }
      } catch (error) {
        logger.error('Queue processor error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  // ==================== STEP EXECUTORS ====================

  private async executeFetchData(context: StepExecutionContext): Promise<any> {
    logger.info('Fetching data', context);
    return { data: 'fetched_data', timestamp: Date.now() };
  }

  private async executeProcessData(context: StepExecutionContext): Promise<any> {
    logger.info('Processing data', context);
    return { processed: true, input: context.dependencies };
  }

  private async executeValidate(context: StepExecutionContext): Promise<any> {
    logger.info('Validating', context);
    return { valid: true };
  }

  private async executeTransform(context: StepExecutionContext): Promise<any> {
    logger.info('Transforming', context);
    return { transformed: context.dependencies };
  }

  private async executeStore(context: StepExecutionContext): Promise<any> {
    logger.info('Storing', context);
    return { stored: true, id: crypto.randomUUID() };
  }

  private async executeCallApi(context: StepExecutionContext): Promise<any> {
    logger.info('Calling API', context);
    return { response: 'api_response' };
  }

  private async executeAnalyze(context: StepExecutionContext): Promise<any> {
    logger.info('Analyzing', context);
    const prompt = `Analyze: ${JSON.stringify(context.dependencies)}`;
    return await geminiService.generateContent(prompt);
  }

  private generateWorkerId(): string {
    return `worker_${crypto.randomBytes(8).toString('hex')}`;
  }
}

export const workflowRunnerService = new WorkflowRunnerService();
