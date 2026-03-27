import { v4 as uuidv4 } from 'uuid';
import logger from "@/config/logger.js";
import {
  Decision,
  DecisionInput,
  ActionType,
  RiskLevel
} from "@/types/autonomy.types.js";

/**
 * Decision Engine Service
 * Analyzes system state and recommends autonomous actions
 */
export class DecisionEngineService {
  private decisionHistory: Decision[] = [];

  /**
   * Analyze inputs and generate decision
   */
  async makeDecision(input: DecisionInput): Promise<Decision> {
    logger.info('Decision engine analyzing input', { context: input.context });

    // Analyze system state
    const analysis = this.analyzeSystemState(input);
    
    // Determine action
    const action = this.determineAction(analysis, input);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(analysis, input);
    
    // Assess risk
    const riskLevel = this.assessRisk(action, confidence, input);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(action, analysis, input);
    
    // Create decision
    const decision: Decision = {
      id: uuidv4(),
      action,
      confidence,
      riskLevel,
      reasoning,
      dataUsed: this.extractDataSources(input),
      expectedOutcome: this.predictOutcome(action, input),
      rollbackPlan: this.generateRollbackPlan(action),
      requiresApproval: this.requiresApproval(riskLevel, confidence),
      createdAt: new Date()
    };

    this.decisionHistory.push(decision);
    logger.info('Decision made', { decision });

    return decision;
  }

  /**
   * Analyze system state
   */
  private analyzeSystemState(input: DecisionInput) {
    const { systemHealth, predictions, userBehavior } = input;

    return {
      isHealthy: systemHealth.errorRate < 0.1 && systemHealth.cpu < 80,
      hasFailures: systemHealth.errorRate > 0.5,
      isOverloaded: systemHealth.cpu > 90 || systemHealth.memory > 90,
      hasHighLatency: systemHealth.latency > 1000,
      hasPredictions: predictions.length > 0,
      userInterventionRate: userBehavior.interventionRate,
      criticalIssue: systemHealth.errorRate > 0.8
    };
  }

  /**
   * Determine appropriate action
   */
  private determineAction(analysis: any, input: DecisionInput): ActionType {
    // Critical issues - pause immediately
    if (analysis.criticalIssue) {
      return ActionType.PAUSE_WORKFLOW;
    }

    // High failure rate - pause
    if (analysis.hasFailures) {
      return ActionType.PAUSE_WORKFLOW;
    }

    // System overloaded - scale or pause
    if (analysis.isOverloaded) {
      return ActionType.SCALE_RESOURCES;
    }

    // Check predictions for specific actions
    const prediction = input.predictions[0];
    if (prediction?.type === 'workflow_failure') {
      return ActionType.RETRY_WORKFLOW;
    }

    // System healthy and workflow paused - resume
    if (analysis.isHealthy && input.context.workflowId) {
      return ActionType.RESUME_WORKFLOW;
    }

    // Default - alert user
    return ActionType.ALERT_USER;
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(analysis: any, input: DecisionInput): number {
    let confidence = 50; // Base confidence

    // Increase confidence based on data quality
    if (input.predictions.length > 3) confidence += 15;
    if (analysis.isHealthy) confidence += 20;
    if (input.userBehavior.interventionRate < 0.2) confidence += 15;

    // Decrease confidence for uncertainty
    if (analysis.hasHighLatency) confidence -= 10;
    if (input.predictions.length === 0) confidence -= 20;
    if (input.userBehavior.interventionRate > 0.5) confidence -= 15;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Assess risk level
   */
  private assessRisk(
    action: ActionType,
    confidence: number,
    input: DecisionInput
  ): RiskLevel {
    // Critical actions are always high risk
    if (action === ActionType.CANCEL_WORKFLOW) {
      return RiskLevel.CRITICAL;
    }

    // Low confidence = higher risk
    if (confidence < 50) {
      return RiskLevel.HIGH;
    }

    // Action-specific risk assessment
    switch (action) {
      case ActionType.PAUSE_WORKFLOW:
        return confidence > 80 ? RiskLevel.LOW : RiskLevel.MEDIUM;
      
      case ActionType.RESUME_WORKFLOW:
        return input.systemHealth.errorRate < 0.1 ? RiskLevel.LOW : RiskLevel.MEDIUM;
      
      case ActionType.RETRY_WORKFLOW:
        return RiskLevel.LOW;
      
      case ActionType.SCALE_RESOURCES:
        return RiskLevel.MEDIUM;
      
      case ActionType.OPTIMIZE_PARAMETERS:
        return RiskLevel.MEDIUM;
      
      default:
        return RiskLevel.LOW;
    }
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    action: ActionType,
    analysis: any,
    input: DecisionInput
  ): string {
    const reasons: string[] = [];

    if (analysis.criticalIssue) {
      reasons.push('Critical error rate detected (>80%)');
    }
    if (analysis.hasFailures) {
      reasons.push('High failure rate detected (>50%)');
    }
    if (analysis.isOverloaded) {
      reasons.push('System resources critically high');
    }
    if (analysis.isHealthy) {
      reasons.push('System health is optimal');
    }

    const actionReason = this.getActionReason(action);
    reasons.push(actionReason);

    return reasons.join('. ');
  }

  /**
   * Get action-specific reason
   */
  private getActionReason(action: ActionType): string {
    const reasons: Record<ActionType, string> = {
      [ActionType.RETRY_WORKFLOW]: 'Retrying workflow may resolve transient failures',
      [ActionType.PAUSE_WORKFLOW]: 'Pausing workflow prevents cascading failures',
      [ActionType.RESUME_WORKFLOW]: 'System is stable enough to resume operations',
      [ActionType.CANCEL_WORKFLOW]: 'Workflow cannot be recovered safely',
      [ActionType.SCALE_RESOURCES]: 'Additional resources will improve performance',
      [ActionType.OPTIMIZE_PARAMETERS]: 'Parameter optimization will improve efficiency',
      [ActionType.ALERT_USER]: 'User attention required for decision'
    };

    return reasons[action];
  }

  /**
   * Extract data sources used
   */
  private extractDataSources(input: DecisionInput): string[] {
    const sources: string[] = [];

    if (input.predictions.length > 0) {
      sources.push(`${input.predictions.length} predictions`);
    }
    sources.push('System health metrics');
    sources.push('User behavior patterns');
    
    if (input.context.workflowId) {
      sources.push(`Workflow ${input.context.workflowId}`);
    }

    return sources;
  }

  /**
   * Predict expected outcome
   */
  private predictOutcome(action: ActionType, input: DecisionInput): string {
    const outcomes: Record<ActionType, string> = {
      [ActionType.RETRY_WORKFLOW]: 'Workflow will complete successfully on retry',
      [ActionType.PAUSE_WORKFLOW]: 'System stability will improve, preventing data loss',
      [ActionType.RESUME_WORKFLOW]: 'Workflow will continue with normal performance',
      [ActionType.CANCEL_WORKFLOW]: 'Resources will be freed, preventing system degradation',
      [ActionType.SCALE_RESOURCES]: 'Performance will improve by 30-50%',
      [ActionType.OPTIMIZE_PARAMETERS]: 'Efficiency will improve by 20-30%',
      [ActionType.ALERT_USER]: 'User will make informed decision'
    };

    return outcomes[action];
  }

  /**
   * Generate rollback plan
   */
  private generateRollbackPlan(action: ActionType): string {
    const plans: Record<ActionType, string> = {
      [ActionType.RETRY_WORKFLOW]: 'Stop retry and restore previous state',
      [ActionType.PAUSE_WORKFLOW]: 'Resume workflow immediately',
      [ActionType.RESUME_WORKFLOW]: 'Pause workflow again',
      [ActionType.CANCEL_WORKFLOW]: 'Restart workflow from last checkpoint',
      [ActionType.SCALE_RESOURCES]: 'Scale down to previous resource levels',
      [ActionType.OPTIMIZE_PARAMETERS]: 'Restore original parameters',
      [ActionType.ALERT_USER]: 'No rollback needed'
    };

    return plans[action];
  }

  /**
   * Determine if approval is required
   */
  private requiresApproval(riskLevel: RiskLevel, confidence: number): boolean {
    // Critical risk always requires approval
    if (riskLevel === RiskLevel.CRITICAL) return true;
    
    // High risk requires approval
    if (riskLevel === RiskLevel.HIGH) return true;
    
    // Medium risk with low confidence requires approval
    if (riskLevel === RiskLevel.MEDIUM && confidence < 70) return true;
    
    // Low risk doesn't require approval
    return false;
  }

  /**
   * Get decision history
   */
  getHistory(limit: number = 100): Decision[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get decision by ID
   */
  getDecision(id: string): Decision | undefined {
    return this.decisionHistory.find(d => d.id === id);
  }
}

export const decisionEngineService = new DecisionEngineService();
