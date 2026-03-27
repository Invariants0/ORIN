import logger from '@/config/logger.js';
import { geminiService } from '@/services/ai/gemini.service.js';
import { agentService } from '@/services/orchestration/agent.service.js';
import { taskService } from '@/services/workflow/task.service.js';
import { executionService } from '@/services/workflow/execution.service.js';
import { workflowRepository } from '@/services/workflow/workflow.repository.js';

interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  retryable: boolean;
  maxRetries: number;
}

interface Workflow {
  id: string;
  goal: string;
  steps: WorkflowStep[];
  createdAt: Date;
  metadata: Record<string, any>;
}

interface WorkflowState {
  workflowId: string;
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: string | null;
  completedSteps: string[];
  failedSteps: Array<{ stepId: string; error: string; attempts: number }>;
  pausedAt: string | null;
  pauseReason: string | null;
  startedAt: Date;
  completedAt: Date | null;
  results: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  stepId: string;
  output: any;
  error?: string;
  duration: number;
}

interface RecoveryStrategy {
  type: 'retry' | 'skip' | 'alternative' | 'abort';
  reason: string;
  alternativeStep?: WorkflowStep;
}

class WorkflowAgentService {
  private workflows: Map<string, Workflow> = new Map();
  private workflowStates: Map<string, WorkflowState> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  /**
   * Plan a multi-step workflow from a high-level goal
   */
  async planWorkflow(
    goal: string,
    userId: string,
    sessionId: string
  ): Promise<Workflow> {
    try {
      logger.info('Planning workflow', { goal, userId });

      const prompt = this.buildPlanningPrompt(goal);
      const response = await geminiService.generateContent(prompt);
      const steps = this.parseWorkflowSteps(response);

      const workflow: Workflow = {
        id: this.generateWorkflowId(),
        goal,
        steps,
        createdAt: new Date(),
        metadata: { userId, sessionId }
      };

      // Store in database
      const dbWorkflow = await workflowRepository.createWorkflow({
        userId,
        sessionId,
        goal,
        steps: steps.map(step => ({
          stepId: step.id,
          name: step.name,
          action: step.action,
          parameters: step.parameters,
          dependencies: step.dependencies,
          riskLevel: step.riskLevel,
          estimatedDuration: step.estimatedDuration,
          retryable: step.retryable,
          maxRetries: step.maxRetries
        })),
        metadata: { userId, sessionId }
      });

      workflow.id = dbWorkflow.id;
      this.workflows.set(workflow.id, workflow);
      this.initializeWorkflowState(workflow.id);

      logger.info('Workflow planned and persisted', {
        workflowId: workflow.id,
        stepCount: steps.length
      });

      return workflow;
    } catch (error) {
      logger.error('Workflow planning failed:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow step by step
   */
  async executeWorkflow(
    workflowId: string,
    userId: string
  ): Promise<WorkflowState> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const state = this.workflowStates.get(workflowId);
      if (!state) {
        throw new Error(`Workflow state ${workflowId} not found`);
      }

      state.status = 'running';
      state.startedAt = new Date();

      logger.info('Starting workflow execution', { workflowId });

      // Execute steps in dependency order
      const executionOrder = this.resolveExecutionOrder(workflow.steps);

      for (const step of executionOrder) {
        // Check if already completed
        if (state.completedSteps.includes(step.id)) {
          continue;
        }

        // Check if dependencies are met
        if (!this.areDependenciesMet(step, state)) {
          logger.warn('Dependencies not met, skipping step', { stepId: step.id });
          continue;
        }

        // Update current step
        state.currentStep = step.id;

        // Check if should pause (risk or confidence check)
        const shouldPause = await this.shouldPauseBeforeStep(step, workflow, userId);
        if (shouldPause.pause) {
          state.status = 'paused';
          state.pausedAt = step.id;
          state.pauseReason = shouldPause.reason;
          logger.info('Workflow paused', { stepId: step.id, reason: shouldPause.reason });
          return state;
        }

        // Execute step with retry logic
        const result = await this.executeStepWithRetry(step, workflow, state);

        if (result.success) {
          state.completedSteps.push(step.id);
          state.results[step.id] = result.output;
          logger.info('Step completed', { stepId: step.id });
        } else {
          // Handle failure
          const recovery = await this.determineRecoveryStrategy(step, result, state);
          
          if (recovery.type === 'abort') {
            state.status = 'failed';
            state.failedSteps.push({
              stepId: step.id,
              error: result.error || 'Unknown error',
              attempts: this.getStepAttempts(step.id, state)
            });
            logger.error('Workflow aborted', { stepId: step.id });
            return state;
          } else if (recovery.type === 'alternative' && recovery.alternativeStep) {
            // Insert alternative step
            workflow.steps.push(recovery.alternativeStep);
            logger.info('Using alternative step', { originalStep: step.id });
          } else if (recovery.type === 'skip') {
            logger.warn('Skipping failed step', { stepId: step.id });
            continue;
          }
        }
      }

      // Workflow completed
      state.status = 'completed';
      state.completedAt = new Date();
      state.currentStep = null;

      logger.info('Workflow completed', {
        workflowId,
        duration: state.completedAt.getTime() - state.startedAt.getTime()
      });

      return state;
    } catch (error) {
      logger.error('Workflow execution failed:', error);
      const state = this.workflowStates.get(workflowId);
      if (state) {
        state.status = 'failed';
      }
      throw error;
    }
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(
    workflowId: string,
    userId: string,
    userApproval: boolean
  ): Promise<WorkflowState> {
    const state = this.workflowStates.get(workflowId);
    if (!state || state.status !== 'paused') {
      throw new Error('Workflow is not paused');
    }

    if (!userApproval) {
      state.status = 'failed';
      logger.info('Workflow cancelled by user', { workflowId });
      return state;
    }

    logger.info('Resuming workflow', { workflowId });
    return await this.executeWorkflow(workflowId, userId);
  }

  /**
   * Get workflow state
   */
  getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.workflowStates.get(workflowId);
  }

  /**
   * Get workflow details
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(workflowId: string): void {
    const state = this.workflowStates.get(workflowId);
    if (state) {
      state.status = 'failed';
      state.pauseReason = 'Cancelled by user';
      logger.info('Workflow cancelled', { workflowId });
    }
  }

  // ==================== PRIVATE METHODS ====================

  private buildPlanningPrompt(goal: string): string {
    return `Break down this goal into a detailed multi-step workflow.

GOAL: ${goal}

Create a workflow plan in this JSON format:
{
  "steps": [
    {
      "id": "step_1",
      "name": "Step name",
      "action": "action_type",
      "parameters": {},
      "dependencies": [],
      "riskLevel": "low|medium|high",
      "estimatedDuration": 1000,
      "retryable": true,
      "maxRetries": 3
    }
  ]
}

RULES:
1. Break complex tasks into atomic steps
2. Identify dependencies between steps
3. Classify risk level for each step
4. Make steps as independent as possible
5. Include error handling considerations
6. Estimate duration in milliseconds

ACTION TYPES:
- fetch_data
- process_data
- validate
- transform
- store
- notify
- execute_code
- call_api
- analyze`;
  }

  private parseWorkflowSteps(response: string): WorkflowStep[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.steps || [];
    } catch (error) {
      logger.error('Failed to parse workflow steps:', error);
      throw new Error('Invalid workflow plan format');
    }
  }

  private initializeWorkflowState(workflowId: string): void {
    const state: WorkflowState = {
      workflowId,
      status: 'planning',
      currentStep: null,
      completedSteps: [],
      failedSteps: [],
      pausedAt: null,
      pauseReason: null,
      startedAt: new Date(),
      completedAt: null,
      results: {}
    };

    this.workflowStates.set(workflowId, state);
  }

  private resolveExecutionOrder(steps: WorkflowStep[]): WorkflowStep[] {
    const ordered: WorkflowStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: WorkflowStep) => {
      if (visited.has(step.id)) return;
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected: ${step.id}`);
      }

      visiting.add(step.id);

      // Visit dependencies first
      for (const depId of step.dependencies) {
        const depStep = steps.find(s => s.id === depId);
        if (depStep) {
          visit(depStep);
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      ordered.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return ordered;
  }

  private areDependenciesMet(step: WorkflowStep, state: WorkflowState): boolean {
    return step.dependencies.every(depId => 
      state.completedSteps.includes(depId)
    );
  }

  private async shouldPauseBeforeStep(
    step: WorkflowStep,
    workflow: Workflow,
    userId: string
  ): Promise<{ pause: boolean; reason?: string }> {
    // Pause for high-risk operations
    if (step.riskLevel === 'high') {
      return {
        pause: true,
        reason: `High-risk operation: ${step.name}. User approval required.`
      };
    }

    // Check confidence using agent service
    const action = {
      suggestedAction: step.action,
      actionType: 'task' as const,
      confidence: 0.9, // Would be calculated in real scenario
      reasoning: step.name
    };

    const risk = agentService.classifyTask(step.action, step.action);
    
    if (risk.level === 'high' || risk.level === 'medium') {
      return {
        pause: true,
        reason: `Risk level ${risk.level}: ${risk.factors.join(', ')}`
      };
    }

    return { pause: false };
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    workflow: Workflow,
    state: WorkflowState
  ): Promise<ExecutionResult> {
    const maxAttempts = step.retryable ? step.maxRetries : 1;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info('Executing step', {
          stepId: step.id,
          attempt,
          maxAttempts
        });

        const startTime = Date.now();
        const output = await this.executeStep(step, state);
        const duration = Date.now() - startTime;

        return {
          success: true,
          stepId: step.id,
          output,
          duration
        };
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        logger.warn('Step execution failed', {
          stepId: step.id,
          attempt,
          error: lastError
        });

        if (attempt < maxAttempts) {
          // Wait before retry
          await this.delay(this.RETRY_DELAY_MS * attempt);
        }
      }
    }

    return {
      success: false,
      stepId: step.id,
      output: null,
      error: lastError,
      duration: 0
    };
  }

  private async executeStep(
    step: WorkflowStep,
    state: WorkflowState
  ): Promise<any> {
    // Get results from dependencies
    const dependencyResults = step.dependencies.reduce((acc, depId) => {
      acc[depId] = state.results[depId];
      return acc;
    }, {} as Record<string, any>);

    // Execute based on action type
    switch (step.action) {
      case 'fetch_data':
        return await this.executeFetchData(step, dependencyResults);
      case 'process_data':
        return await this.executeProcessData(step, dependencyResults);
      case 'validate':
        return await this.executeValidate(step, dependencyResults);
      case 'transform':
        return await this.executeTransform(step, dependencyResults);
      case 'store':
        return await this.executeStore(step, dependencyResults);
      case 'call_api':
        return await this.executeCallApi(step, dependencyResults);
      case 'analyze':
        return await this.executeAnalyze(step, dependencyResults);
      default:
        throw new Error(`Unknown action type: ${step.action}`);
    }
  }

  private async determineRecoveryStrategy(
    step: WorkflowStep,
    result: ExecutionResult,
    state: WorkflowState
  ): Promise<RecoveryStrategy> {
    const attempts = this.getStepAttempts(step.id, state);

    // If max retries exceeded and not critical, skip
    if (attempts >= step.maxRetries && !this.isCriticalStep(step)) {
      return {
        type: 'skip',
        reason: 'Max retries exceeded, step is not critical'
      };
    }

    // If critical step failed, try alternative
    if (this.isCriticalStep(step)) {
      const alternative = await this.generateAlternativeStep(step, result.error);
      if (alternative) {
        return {
          type: 'alternative',
          reason: 'Critical step failed, using alternative approach',
          alternativeStep: alternative
        };
      }
    }

    // If retryable and under max attempts, retry
    if (step.retryable && attempts < step.maxRetries) {
      return {
        type: 'retry',
        reason: `Retry attempt ${attempts + 1}/${step.maxRetries}`
      };
    }

    // Otherwise abort
    return {
      type: 'abort',
      reason: 'Critical step failed with no recovery options'
    };
  }

  private async generateAlternativeStep(
    failedStep: WorkflowStep,
    error?: string
  ): Promise<WorkflowStep | null> {
    try {
      const prompt = `Generate an alternative approach for this failed step:

FAILED STEP: ${JSON.stringify(failedStep, null, 2)}
ERROR: ${error || 'Unknown'}

Provide an alternative step in the same JSON format that achieves the same goal using a different approach.`;

      const response = await geminiService.generateContent(prompt);
      const alternative = JSON.parse(response);
      
      return {
        ...alternative,
        id: `${failedStep.id}_alt`,
        dependencies: failedStep.dependencies
      };
    } catch (error) {
      logger.error('Failed to generate alternative step:', error);
      return null;
    }
  }

  private getStepAttempts(stepId: string, state: WorkflowState): number {
    const failed = state.failedSteps.find(f => f.stepId === stepId);
    return failed ? failed.attempts : 0;
  }

  private isCriticalStep(step: WorkflowStep): boolean {
    // Steps with dependents are critical
    return step.riskLevel === 'high' || step.dependencies.length > 0;
  }

  // ==================== STEP EXECUTORS ====================

  private async executeFetchData(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Fetching data', { stepId: step.id });
    // Simulate data fetch
    return { data: 'fetched_data', timestamp: Date.now() };
  }

  private async executeProcessData(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Processing data', { stepId: step.id });
    return { processed: true, input: deps };
  }

  private async executeValidate(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Validating', { stepId: step.id });
    return { valid: true };
  }

  private async executeTransform(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Transforming', { stepId: step.id });
    return { transformed: deps };
  }

  private async executeStore(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Storing', { stepId: step.id });
    return { stored: true, id: this.generateWorkflowId() };
  }

  private async executeCallApi(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Calling API', { stepId: step.id });
    return { response: 'api_response' };
  }

  private async executeAnalyze(
    step: WorkflowStep,
    deps: Record<string, any>
  ): Promise<any> {
    logger.info('Analyzing', { stepId: step.id });
    const prompt = `Analyze: ${JSON.stringify(deps)}`;
    return await geminiService.generateContent(prompt);
  }

  // ==================== UTILITIES ====================

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workflowAgentService = new WorkflowAgentService();
