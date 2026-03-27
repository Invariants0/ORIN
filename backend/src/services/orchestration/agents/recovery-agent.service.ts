// Recovery Agent - Phase 20

import { BaseAgent } from './base-agent.service.js';
import {
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  RecoveryInput,
  MessagePriority
} from '@/types/agent.types.js';

export class RecoveryAgent extends BaseAgent {
  private recoveryStrategies = {
    retry: { maxAttempts: 3, backoffMs: 1000 },
    rollback: { checkpointRetention: 5 },
    restart: { cooldownMs: 5000 }
  };

  constructor() {
    super(AgentType.RECOVERY, AuthorityLevel.EXECUTE_SAFE);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Processing message', { messageType: message.type, from: message.from });

    switch (message.type) {
      case 'request':
        return await this.handleRecoveryRequest(message);

      case 'alert':
        await this.handleFailureAlert(message);
        return null;

      default:
        this.log('warn', 'Unknown message type', { type: message.type });
        return null;
    }
  }

  async proposeAction(context: RecoveryInput): Promise<AgentProposal | null> {
    this.status = AgentStatus.ACTIVE;

    try {
      if (context.failures.length === 0) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      // Analyze failures and determine recovery strategy
      const strategy = this.determineRecoveryStrategy(context);

      if (!strategy) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      const proposal = this.createProposal(
        strategy.action,
        strategy.reasoning,
        strategy.confidence,
        strategy.expectedOutcome,
        strategy.risks,
        strategy.estimatedDuration
      );

      this.log('info', 'Recovery proposal created', {
        action: proposal.action,
        confidence: proposal.confidence
      });

      return proposal;

    } catch (error: any) {
      this.log('error', 'Failed to propose recovery action', { error: error.message });
      this.status = AgentStatus.ERROR;
      return null;
    }
  }

  async executeAction(proposal: AgentProposal): Promise<any> {
    this.status = AgentStatus.BUSY;

    try {
      this.log('info', 'Executing recovery action', { action: proposal.action });

      let result;
      switch (proposal.action) {
        case 'retry_failed_workflow':
          result = await this.retryWorkflow(proposal);
          break;

        case 'rollback_to_checkpoint':
          result = await this.rollbackToCheckpoint(proposal);
          break;

        case 'restart_component':
          result = await this.restartComponent(proposal);
          break;

        case 'isolate_failure':
          result = await this.isolateFailure(proposal);
          break;

        case 'escalate_to_admin':
          result = await this.escalateToAdmin(proposal);
          break;

        default:
          throw new Error(`Unknown recovery action: ${proposal.action}`);
      }

      this.status = AgentStatus.IDLE;
      return { success: true, result };

    } catch (error: any) {
      this.log('error', 'Recovery action failed', { error: error.message });
      this.status = AgentStatus.ERROR;
      return { success: false, error: error.message };
    }
  }

  private determineRecoveryStrategy(context: RecoveryInput): {
    action: string;
    reasoning: string;
    confidence: number;
    expectedOutcome: string;
    risks: string[];
    estimatedDuration: number;
  } | null {
    const { failures, systemState } = context;

    // Sort failures by severity
    const sortedFailures = failures.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    const mostCritical = sortedFailures[0];

    // Critical system state - escalate immediately
    if (systemState.critical) {
      return {
        action: 'escalate_to_admin',
        reasoning: 'System in critical state, requires immediate admin intervention',
        confidence: 95,
        expectedOutcome: 'Admin will be notified and can take manual action',
        risks: ['Delayed response time'],
        estimatedDuration: 1000
      };
    }

    // Check if failure is transient (can retry)
    if (this.isTransientFailure(mostCritical)) {
      return {
        action: 'retry_failed_workflow',
        reasoning: `Transient failure detected in ${mostCritical.component}, retry likely to succeed`,
        confidence: 80,
        expectedOutcome: 'Workflow will complete successfully on retry',
        risks: ['May fail again if issue persists'],
        estimatedDuration: 5000
      };
    }

    // Check if rollback is possible
    if (this.canRollback(mostCritical)) {
      return {
        action: 'rollback_to_checkpoint',
        reasoning: `Failure in ${mostCritical.component} can be recovered by rolling back to last checkpoint`,
        confidence: 85,
        expectedOutcome: 'System will return to stable state',
        risks: ['Recent changes will be lost'],
        estimatedDuration: 3000
      };
    }

    // Check if component restart will help
    if (this.shouldRestartComponent(mostCritical)) {
      return {
        action: 'restart_component',
        reasoning: `Component ${mostCritical.component} is in failed state, restart will clear the issue`,
        confidence: 75,
        expectedOutcome: 'Component will restart and resume normal operation',
        risks: ['Brief service interruption'],
        estimatedDuration: 10000
      };
    }

    // Isolate failure to prevent spread
    if (failures.length > 3) {
      return {
        action: 'isolate_failure',
        reasoning: 'Multiple failures detected, isolating affected components to prevent cascade',
        confidence: 70,
        expectedOutcome: 'Failure will be contained, healthy components continue operating',
        risks: ['Reduced system capacity'],
        estimatedDuration: 2000
      };
    }

    return null;
  }

  private isTransientFailure(failure: RecoveryInput['failures'][0]): boolean {
    const transientPatterns = [
      'timeout',
      'connection refused',
      'network error',
      'temporary',
      'rate limit'
    ];

    const errorText = (failure.stackTrace || failure.type).toLowerCase();
    return transientPatterns.some(pattern => errorText.includes(pattern));
  }

  private canRollback(failure: RecoveryInput['failures'][0]): boolean {
    // Check if component supports rollback
    const rollbackSupported = ['workflow', 'database', 'state'];
    return rollbackSupported.some(comp => failure.component.includes(comp));
  }

  private shouldRestartComponent(failure: RecoveryInput['failures'][0]): boolean {
    // Restart if component is in failed state and severity is high
    return failure.severity === 'high' || failure.severity === 'critical';
  }

  private async handleRecoveryRequest(message: AgentMessage): Promise<AgentMessage> {
    const { requestType, context } = message.payload;

    this.log('info', 'Handling recovery request', { requestType });

    switch (requestType) {
      case 'handle_failures':
        const recoveryInput: RecoveryInput = context;
        const proposal = await this.proposeAction(recoveryInput);

        if (proposal) {
          // Execute if authority allows
          if (this.authorityLevel === AuthorityLevel.EXECUTE_SAFE) {
            const result = await this.executeAction(proposal);
            return this.createMessage(
              message.from,
              'response',
              { proposal, result },
              MessagePriority.HIGH,
              message.id
            );
          } else {
            // Send proposal to coordinator
            return this.createMessage(
              AgentType.COORDINATOR,
              'proposal',
              { proposal },
              proposal.priority,
              message.id
            );
          }
        }

        return this.createMessage(
          message.from,
          'response',
          { message: 'No recovery action needed' },
          MessagePriority.LOW,
          message.id
        );

      default:
        return this.createMessage(
          message.from,
          'response',
          { error: 'Unknown request type' },
          MessagePriority.LOW,
          message.id
        );
    }
  }

  private async handleFailureAlert(message: AgentMessage): Promise<void> {
    this.log('warn', 'Failure alert received', { payload: message.payload });

    // Create recovery input from alert
    const recoveryInput: RecoveryInput = {
      failures: [{
        id: message.id,
        type: message.payload.action || 'unknown',
        severity: message.priority === 'critical' ? 'critical' : 'high',
        component: message.payload.component || 'unknown',
        timestamp: new Date()
      }],
      systemState: {
        healthy: false,
        degraded: true,
        critical: message.priority === 'critical'
      }
    };

    // Propose recovery action
    const proposal = await this.proposeAction(recoveryInput);

    if (proposal && this.authorityLevel === AuthorityLevel.EXECUTE_SAFE) {
      // Auto-execute safe recovery actions
      await this.executeAction(proposal);
    }
  }

  private async retryWorkflow(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Retrying failed workflow');

    // TODO: Implement actual retry logic
    await this.sleep(2000);

    return {
      action: 'retry',
      status: 'completed',
      attempts: 1,
      maxAttempts: this.recoveryStrategies.retry.maxAttempts
    };
  }

  private async rollbackToCheckpoint(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Rolling back to checkpoint');

    // TODO: Implement actual rollback logic
    await this.sleep(1500);

    return {
      action: 'rollback',
      status: 'completed',
      checkpointId: 'checkpoint_' + Date.now()
    };
  }

  private async restartComponent(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Restarting component');

    // TODO: Implement actual restart logic
    await this.sleep(5000);

    return {
      action: 'restart',
      status: 'completed',
      component: 'unknown'
    };
  }

  private async isolateFailure(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Isolating failure');

    // TODO: Implement actual isolation logic
    await this.sleep(1000);

    return {
      action: 'isolate',
      status: 'completed',
      isolatedComponents: []
    };
  }

  private async escalateToAdmin(proposal: AgentProposal): Promise<any> {
    this.log('warn', 'Escalating to admin');

    // Send message to user assistant
    const message = this.createMessage(
      AgentType.USER_ASSISTANT,
      'alert',
      {
        severity: 'critical',
        message: proposal.reasoning,
        action: 'admin_intervention_required'
      },
      MessagePriority.CRITICAL
    );

    // TODO: Send via message bus

    return {
      action: 'escalate',
      status: 'completed',
      messageId: message.id
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const recoveryAgent = new RecoveryAgent();
