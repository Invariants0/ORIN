import logger from '../config/logger.js';
import { LearningData, ActionType } from '../types/autonomy.types.js';

/**
 * Learning Service
 * Tracks outcomes and improves decision-making over time
 */
export class LearningService {
  private learningData: LearningData[] = [];
  private actionSuccessRates: Map<ActionType, number> = new Map();
  private confidenceAdjustments: Map<ActionType, number> = new Map();

  /**
   * Record learning data from action outcome
   */
  recordOutcome(data: LearningData): void {
    this.learningData.push(data);
    this.updateMetrics(data);
    
    logger.info('Learning data recorded', {
      decisionId: data.decisionId,
      approved: data.userApproved,
      succeeded: data.actionSucceeded
    });
  }

  /**
   * Update success rate metrics
   */
  private updateMetrics(data: LearningData): void {
    // Extract action type from decision (would need to store this)
    // For now, update global metrics
    
    if (data.actionSucceeded) {
      this.incrementSuccessRate(ActionType.RETRY_WORKFLOW);
    }
  }

  /**
   * Increment success rate for action type
   */
  private incrementSuccessRate(actionType: ActionType): void {
    const current = this.actionSuccessRates.get(actionType) || 0.5;
    const updated = current * 0.9 + 0.1; // Weighted average
    this.actionSuccessRates.set(actionType, updated);
  }

  /**
   * Get success rate for action type
   */
  getSuccessRate(actionType: ActionType): number {
    return this.actionSuccessRates.get(actionType) || 0.5;
  }

  /**
   * Get confidence adjustment based on learning
   */
  getConfidenceAdjustment(actionType: ActionType): number {
    const successRate = this.getSuccessRate(actionType);
    
    // Adjust confidence based on historical success
    if (successRate > 0.9) return 10;
    if (successRate > 0.8) return 5;
    if (successRate < 0.5) return -10;
    if (successRate < 0.6) return -5;
    
    return 0;
  }

  /**
   * Analyze user approval patterns
   */
  analyzeApprovalPatterns(): {
    overallApprovalRate: number;
    approvalByAction: Map<ActionType, number>;
    interventionRate: number;
  } {
    if (this.learningData.length === 0) {
      return {
        overallApprovalRate: 0.5,
        approvalByAction: new Map(),
        interventionRate: 0.5
      };
    }

    const approved = this.learningData.filter(d => d.userApproved).length;
    const intervened = this.learningData.filter(d => d.userIntervened).length;

    return {
      overallApprovalRate: approved / this.learningData.length,
      approvalByAction: new Map(), // TODO: Implement per-action tracking
      interventionRate: intervened / this.learningData.length
    };
  }

  /**
   * Get learning insights
   */
  getInsights(): {
    totalDataPoints: number;
    successRate: number;
    approvalRate: number;
    interventionRate: number;
    recommendations: string[];
  } {
    const patterns = this.analyzeApprovalPatterns();
    const succeeded = this.learningData.filter(d => d.actionSucceeded).length;
    const successRate = this.learningData.length > 0 
      ? succeeded / this.learningData.length 
      : 0;

    const recommendations: string[] = [];

    if (patterns.approvalRate > 0.9) {
      recommendations.push('High approval rate - consider increasing autonomy level');
    }

    if (successRate < 0.7) {
      recommendations.push('Low success rate - review decision criteria');
    }

    if (patterns.interventionRate > 0.5) {
      recommendations.push('High intervention rate - system may be too aggressive');
    }

    return {
      totalDataPoints: this.learningData.length,
      successRate,
      approvalRate: patterns.approvalRate,
      interventionRate: patterns.interventionRate,
      recommendations
    };
  }

  /**
   * Export learning data for analysis
   */
  exportData(): LearningData[] {
    return [...this.learningData];
  }

  /**
   * Clear learning data (for testing)
   */
  clearData(): void {
    this.learningData = [];
    this.actionSuccessRates.clear();
    this.confidenceAdjustments.clear();
    logger.info('Learning data cleared');
  }
}

export const learningService = new LearningService();
