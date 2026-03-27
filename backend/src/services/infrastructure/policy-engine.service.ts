import logger from '@/config/logger.js';
import {
  Policy,
  DecisionInput,
  ActionType,
  Decision
} from '@/types/autonomy.types.js';

/**
 * Policy Engine Service
 * Defines and enforces rules for autonomous behavior
 */
export class PolicyEngineService {
  private policies: Policy[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default safety policies
   */
  private initializeDefaultPolicies() {
    this.policies = [
      {
        id: 'never-cancel-critical',
        name: 'Never Auto-Cancel Critical Workflows',
        description: 'Critical workflows must never be automatically cancelled',
        condition: (input) => {
          return input.context.workflowId?.includes('critical') || false;
        },
        action: ActionType.CANCEL_WORKFLOW,
        priority: 100,
        enabled: true
      },
      {
        id: 'max-retry-limit',
        name: 'Maximum Retry Limit',
        description: 'Workflows can only be retried 3 times maximum',
        condition: (input) => {
          // Check retry count from context
          return true; // Enforced in action executor
        },
        action: ActionType.RETRY_WORKFLOW,
        priority: 90,
        enabled: true
      },
      {
        id: 'pause-high-failure',
        name: 'Pause on High Failure Rate',
        description: 'Pause workflows when failure rate exceeds 50%',
        condition: (input) => {
          return input.systemHealth.errorRate > 0.5;
        },
        action: ActionType.PAUSE_WORKFLOW,
        priority: 95,
        enabled: true
      },
      {
        id: 'no-scale-low-confidence',
        name: 'No Scaling on Low Confidence',
        description: 'Prevent resource scaling when confidence is below 70%',
        condition: (input) => {
          return true; // Checked against decision confidence
        },
        action: ActionType.SCALE_RESOURCES,
        priority: 80,
        enabled: true
      },
      {
        id: 'resume-only-healthy',
        name: 'Resume Only When Healthy',
        description: 'Only resume workflows when system health is good',
        condition: (input) => {
          return input.systemHealth.errorRate < 0.1 && 
                 input.systemHealth.cpu < 80;
        },
        action: ActionType.RESUME_WORKFLOW,
        priority: 85,
        enabled: true
      }
    ];

    logger.info('Policy engine initialized', { 
      policyCount: this.policies.length 
    });
  }

  /**
   * Validate decision against policies
   */
  validateDecision(decision: Decision, input: DecisionInput): {
    allowed: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check each policy
    for (const policy of this.policies) {
      if (!policy.enabled) continue;
      if (policy.action !== decision.action) continue;

      // Evaluate policy condition
      try {
        const conditionMet = policy.condition(input);
        
        if (policy.id === 'never-cancel-critical' && conditionMet) {
          violations.push(`Policy violation: ${policy.name}`);
        }

        if (policy.id === 'pause-high-failure' && !conditionMet) {
          warnings.push(`Consider: ${policy.description}`);
        }

        if (policy.id === 'resume-only-healthy' && !conditionMet) {
          violations.push(`Policy violation: ${policy.name} - System not healthy`);
        }

        if (policy.id === 'no-scale-low-confidence' && decision.confidence < 70) {
          violations.push(`Policy violation: ${policy.name} - Confidence too low`);
        }

      } catch (error) {
        logger.error('Policy evaluation error', { policy: policy.id, error });
      }
    }

    const allowed = violations.length === 0;

    if (!allowed) {
      logger.warn('Decision blocked by policies', { 
        decision: decision.id, 
        violations 
      });
    }

    return { allowed, violations, warnings };
  }

  /**
   * Add custom policy
   */
  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    logger.info('Policy added', { policyId: policy.id });
  }

  /**
   * Remove policy
   */
  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index !== -1) {
      this.policies.splice(index, 1);
      logger.info('Policy removed', { policyId });
      return true;
    }
    return false;
  }

  /**
   * Enable/disable policy
   */
  togglePolicy(policyId: string, enabled: boolean): boolean {
    const policy = this.policies.find(p => p.id === policyId);
    if (policy) {
      policy.enabled = enabled;
      logger.info('Policy toggled', { policyId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Get all policies
   */
  getPolicies(): Policy[] {
    return [...this.policies];
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.find(p => p.id === policyId);
  }

  /**
   * Get policies for specific action
   */
  getPoliciesForAction(action: ActionType): Policy[] {
    return this.policies.filter(p => p.action === action && p.enabled);
  }
}

export const policyEngineService = new PolicyEngineService();
