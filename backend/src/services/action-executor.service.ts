import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';
import {
  Decision,
  ActionExecution,
  ActionStatus,
  ActionType,
  AutonomyConfig
} from '../types/autonomy.types.js';
import { policyEngineService } from './policy-engine.service.js';

/**
 * Action Executor Service
 * Executes autonomous actions with safety checks
 */
export class ActionExecutorService {
  private executionHistory: ActionExecution[] = [];
  private retryCount: Map<string, number> = new Map();

  /**
   * Execute decision if allowed
   */
  async executeDecision(
    decision: Decision,
    config: AutonomyConfig,
    input: any
  ): Promise<ActionExecution> {
    logger.info('Executing decision', { decisionId: decision.id });

    // Create execution record
    const execution: ActionExecution = {
      id: uuidv4(),
      decisionId: decision.id,
      status: ActionStatus.PENDING,
      executedAt: undefined,
      result: undefined,
      error: undefined
    };

    try {
      // Check if action is allowed by config
      if (!this.isActionAllowed(decision, config)) {
        execution.status = ActionStatus.REJECTED;
        execution.error = 'Action not allowed by user configuration';
        logger.warn('Action rejected by config', { decision: decision.id });
        return execution;
      }

      // Validate against policies
      const validation = policyEngineService.validateDecision(decision, input);
      if (!validation.allowed) {
        execution.status = ActionStatus.REJECTED;
        execution.error = `Policy violations: ${validation.violations.join(', ')}`;
        logger.warn('Action rejected by policy', { 
          decision: decision.id, 
          violations: validation.violations 
        });
        return execution;
      }

      // Check if approval is required
      if (decision.requiresApproval) {
        execution.status = ActionStatus.PENDING;
        logger.info('Action requires approval', { decision: decision.id });
        return execution;
      }

      // Execute the action
      execution.status = ActionStatus.EXECUTED;
      execution.executedAt = new Date();
      execution.result = await this.performAction(decision, config);

      logger.info('Action executed successfully', { 
        decisionId: decision.id,
        action: decision.action 
      });

    } catch (error: any) {
      execution.status = ActionStatus.FAILED;
      execution.error = error.message;
      logger.error('Action execution failed', { 
        decisionId: decision.id, 
        error: error.message 
      });
    }

    this.executionHistory.push(execution);
    return execution;
  }

  /**
   * Check if action is allowed by user config
   */
  private isActionAllowed(decision: Decision, config: AutonomyConfig): boolean {
    // Check if action is blocked
    if (config.blockedActions.includes(decision.action)) {
      return false;
    }

    // Check if action is in allowed list
    if (config.allowedActions.length > 0 && 
        !config.allowedActions.includes(decision.action)) {
      return false;
    }

    // Check confidence threshold
    if (decision.confidence < config.confidenceThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Perform the actual action
   */
  private async performAction(
    decision: Decision,
    config: AutonomyConfig
  ): Promise<any> {
    switch (decision.action) {
      case ActionType.RETRY_WORKFLOW:
        return await this.retryWorkflow(decision, config);
      
      case ActionType.PAUSE_WORKFLOW:
        return await this.pauseWorkflow(decision);
      
      case ActionType.RESUME_WORKFLOW:
        return await this.resumeWorkflow(decision);
      
      case ActionType.SCALE_RESOURCES:
        return await this.scaleResources(decision);
      
      case ActionType.OPTIMIZE_PARAMETERS:
        return await this.optimizeParameters(decision);
      
      case ActionType.ALERT_USER:
        return await this.alertUser(decision);
      
      default:
        throw new Error(`Unknown action type: ${decision.action}`);
    }
  }

  /**
   * Retry workflow with exponential backoff
   */
  private async retryWorkflow(
    decision: Decision,
    config: AutonomyConfig
  ): Promise<any> {
    const workflowId = decision.id; // Extract from decision context
    const currentRetries = this.retryCount.get(workflowId) || 0;

    // Check max retries
    if (currentRetries >= config.maxRetries) {
      throw new Error(`Max retries (${config.maxRetries}) exceeded`);
    }

    // Increment retry count
    this.retryCount.set(workflowId, currentRetries + 1);

    // Calculate backoff delay
    const delay = Math.pow(2, currentRetries) * 1000; // Exponential backoff

    logger.info('Retrying workflow', { 
      workflowId, 
      attempt: currentRetries + 1,
      delay 
    });

    // Simulate retry (integrate with actual workflow service)
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      workflowId,
      retryAttempt: currentRetries + 1,
      status: 'retrying'
    };
  }

  /**
   * Pause workflow
   */
  private async pauseWorkflow(decision: Decision): Promise<any> {
    logger.info('Pausing workflow', { decision: decision.id });

    // Integrate with workflow service
    return {
      status: 'paused',
      reason: decision.reasoning,
      timestamp: new Date()
    };
  }

  /**
   * Resume workflow
   */
  private async resumeWorkflow(decision: Decision): Promise<any> {
    logger.info('Resuming workflow', { decision: decision.id });

    // Integrate with workflow service
    return {
      status: 'resumed',
      timestamp: new Date()
    };
  }

  /**
   * Scale resources
   */
  private async scaleResources(decision: Decision): Promise<any> {
    logger.info('Scaling resources', { decision: decision.id });

    // Integrate with infrastructure service
    return {
      action: 'scaled',
      newCapacity: 'increased',
      timestamp: new Date()
    };
  }

  /**
   * Optimize parameters
   */
  private async optimizeParameters(decision: Decision): Promise<any> {
    logger.info('Optimizing parameters', { decision: decision.id });

    // Integrate with optimization service
    return {
      action: 'optimized',
      improvements: ['parameter_a', 'parameter_b'],
      timestamp: new Date()
    };
  }

  /**
   * Alert user
   */
  private async alertUser(decision: Decision): Promise<any> {
    logger.info('Alerting user', { decision: decision.id });

    // Integrate with notification service
    return {
      action: 'alerted',
      message: decision.reasoning,
      timestamp: new Date()
    };
  }

  /**
   * Approve pending action
   */
  async approveAction(executionId: string): Promise<ActionExecution> {
    const execution = this.executionHistory.find(e => e.id === executionId);
    
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== ActionStatus.PENDING) {
      throw new Error('Execution is not pending approval');
    }

    execution.status = ActionStatus.APPROVED;
    logger.info('Action approved', { executionId });

    return execution;
  }

  /**
   * Undo executed action
   */
  async undoAction(executionId: string): Promise<void> {
    const execution = this.executionHistory.find(e => e.id === executionId);
    
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== ActionStatus.EXECUTED) {
      throw new Error('Only executed actions can be undone');
    }

    logger.info('Undoing action', { executionId });

    // Perform rollback based on action type
    // Implementation depends on specific action

    execution.status = ActionStatus.UNDONE;
    execution.undoneAt = new Date();
  }

  /**
   * Get execution history
   */
  getHistory(limit: number = 100): ActionExecution[] {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get execution by ID
   */
  getExecution(id: string): ActionExecution | undefined {
    return this.executionHistory.find(e => e.id === id);
  }
}

export const actionExecutorService = new ActionExecutorService();
