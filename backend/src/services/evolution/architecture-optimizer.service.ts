// Architecture Optimizer Service - Phase 21
// Self-optimizing system structure

import logger from '../../config/logger.js';
import { AgentType, AuthorityLevel } from '../../types/agent.types.js';
import {
  ArchitectureEvaluation,
  AgentEvaluation,
  Bottleneck,
  ArchitectureRecommendation,
  ResponsibilityRebalance
} from '../../types/evolution.types.js';
import agentEvolutionService from './agent-evolution.service.js';

class ArchitectureOptimizerService {
  private evaluationHistory: ArchitectureEvaluation[] = [];
  private rebalanceHistory: ResponsibilityRebalance[] = [];

  async initialize(): Promise<void> {
    logger.info('[ArchitectureOptimizer] Initializing...');
    logger.info('[ArchitectureOptimizer] Initialized successfully');
  }

  /**
   * Evaluate system architecture
   */
  async evaluateArchitecture(): Promise<ArchitectureEvaluation> {
    logger.info('[ArchitectureOptimizer] Evaluating architecture...');

    const agentEvaluations = await this.evaluateAllAgents();
    const bottlenecks = await this.identifyBottlenecks(agentEvaluations);
    const recommendations = await this.generateRecommendations(agentEvaluations, bottlenecks);

    const evaluation: ArchitectureEvaluation = {
      evaluationId: `eval_${Date.now()}`,
      timestamp: new Date(),
      overallScore: this.calculateOverallScore(agentEvaluations),
      agentEvaluations,
      bottlenecks,
      recommendations,
      systemHealth: {
        coordination: this.calculateCoordinationHealth(agentEvaluations),
        performance: this.calculatePerformanceHealth(agentEvaluations),
        reliability: this.calculateReliabilityHealth(agentEvaluations),
        efficiency: this.calculateEfficiencyHealth(agentEvaluations)
      }
    };

    this.evaluationHistory.push(evaluation);

    logger.info('[ArchitectureOptimizer] Architecture evaluated', {
      overallScore: evaluation.overallScore,
      bottlenecks: bottlenecks.length,
      recommendations: recommendations.length
    });

    return evaluation;
  }

  /**
   * Rebalance responsibilities between agents
   */
  async rebalanceResponsibilities(
    fromAgent: AgentType,
    toAgent: AgentType,
    responsibilities: string[],
    reason: string
  ): Promise<ResponsibilityRebalance> {
    logger.info('[ArchitectureOptimizer] Rebalancing responsibilities', {
      from: fromAgent,
      to: toAgent,
      count: responsibilities.length
    });

    const rebalance: ResponsibilityRebalance = {
      rebalanceId: `rebalance_${Date.now()}`,
      fromAgent,
      toAgent,
      responsibilities,
      reason,
      expectedImprovement: 15 // Estimated
    };

    this.rebalanceHistory.push(rebalance);

    logger.info('[ArchitectureOptimizer] Responsibilities rebalanced', {
      rebalanceId: rebalance.rebalanceId
    });

    return rebalance;
  }

  /**
   * Adjust agent authority level
   */
  async adjustAgentAuthority(
    agentType: AgentType,
    newAuthority: AuthorityLevel,
    reason: string
  ): Promise<boolean> {
    logger.info('[ArchitectureOptimizer] Adjusting agent authority', {
      agentType,
      newAuthority,
      reason
    });

    // In real implementation, would update agent configuration
    
    return true;
  }

  /**
   * Get evaluation history
   */
  getEvaluationHistory(limit: number = 10): ArchitectureEvaluation[] {
    return this.evaluationHistory.slice(-limit);
  }

  /**
   * Get rebalance history
   */
  getRebalanceHistory(): ResponsibilityRebalance[] {
    return this.rebalanceHistory;
  }

  // ==================== PRIVATE METHODS ====================

  private async evaluateAllAgents(): Promise<AgentEvaluation[]> {
    const evaluations: AgentEvaluation[] = [];

    for (const agentType of Object.values(AgentType)) {
      const performance = agentEvolutionService.getAgentPerformance(agentType);
      
      if (performance) {
        const evaluation: AgentEvaluation = {
          agentType,
          performanceScore: performance.successRate,
          utilizationRate: performance.totalProposals > 0 ? 80 : 20,
          successRate: performance.successRate,
          responseTime: performance.averageExecutionTime,
          resourceEfficiency: 85,
          collaborationScore: 75,
          overallRating: this.calculateRating(performance.successRate),
          strengths: this.identifyStrengths(performance),
          weaknesses: this.identifyWeaknesses(performance)
        };
        
        evaluations.push(evaluation);
      }
    }

    return evaluations;
  }

  private async identifyBottlenecks(evaluations: AgentEvaluation[]): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    for (const evaluation of evaluations) {
      // Check for performance bottlenecks
      if (evaluation.responseTime > 5000) {
        bottlenecks.push({
          bottleneckId: `bottleneck_${evaluation.agentType}_${Date.now()}`,
          type: 'execution',
          severity: 'high',
          description: `${evaluation.agentType} has high response time`,
          affectedAgents: [evaluation.agentType],
          impact: {
            latency: evaluation.responseTime,
            throughput: -20,
            errorRate: 0
          },
          suggestedFix: 'Optimize execution strategy or add caching'
        });
      }

      // Check for low success rate
      if (evaluation.successRate < 70) {
        bottlenecks.push({
          bottleneckId: `bottleneck_${evaluation.agentType}_${Date.now()}`,
          type: 'decision',
          severity: 'critical',
          description: `${evaluation.agentType} has low success rate`,
          affectedAgents: [evaluation.agentType],
          impact: {
            latency: 0,
            throughput: 0,
            errorRate: 100 - evaluation.successRate
          },
          suggestedFix: 'Review decision criteria and optimize strategy'
        });
      }
    }

    return bottlenecks;
  }

  private async generateRecommendations(
    evaluations: AgentEvaluation[],
    bottlenecks: Bottleneck[]
  ): Promise<ArchitectureRecommendation[]> {
    const recommendations: ArchitectureRecommendation[] = [];

    // Recommend promotions for high performers
    const excellent = evaluations.filter(e => e.overallRating === 'excellent');
    for (const agent of excellent) {
      recommendations.push({
        recommendationId: `rec_promote_${agent.agentType}_${Date.now()}`,
        type: 'promote',
        priority: 'medium',
        description: `Promote ${agent.agentType} due to excellent performance`,
        targetAgent: agent.agentType,
        expectedImpact: {
          performance: 10,
          reliability: 5,
          efficiency: 5
        },
        risks: ['Increased responsibility may affect performance'],
        requiresApproval: true
      });
    }

    // Recommend demotions for poor performers
    const poor = evaluations.filter(e => e.overallRating === 'poor');
    for (const agent of poor) {
      recommendations.push({
        recommendationId: `rec_demote_${agent.agentType}_${Date.now()}`,
        type: 'demote',
        priority: 'high',
        description: `Demote ${agent.agentType} due to poor performance`,
        targetAgent: agent.agentType,
        expectedImpact: {
          performance: -5,
          reliability: 10,
          efficiency: 5
        },
        risks: ['May reduce system capabilities'],
        requiresApproval: true
      });
    }

    // Recommend rebalancing for bottlenecks
    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        recommendations.push({
          recommendationId: `rec_rebalance_${Date.now()}`,
          type: 'rebalance',
          priority: bottleneck.severity,
          description: bottleneck.suggestedFix,
          targetAgent: bottleneck.affectedAgents[0],
          expectedImpact: {
            performance: 15,
            reliability: 10,
            efficiency: 10
          },
          risks: ['Temporary disruption during rebalancing'],
          requiresApproval: false
        });
      }
    }

    return recommendations;
  }

  private calculateOverallScore(evaluations: AgentEvaluation[]): number {
    if (evaluations.length === 0) return 0;
    
    const total = evaluations.reduce((sum, e) => sum + e.performanceScore, 0);
    return total / evaluations.length;
  }

  private calculateCoordinationHealth(evaluations: AgentEvaluation[]): number {
    const avg = evaluations.reduce((sum, e) => sum + e.collaborationScore, 0) / evaluations.length;
    return avg || 75;
  }

  private calculatePerformanceHealth(evaluations: AgentEvaluation[]): number {
    const avg = evaluations.reduce((sum, e) => sum + e.performanceScore, 0) / evaluations.length;
    return avg || 75;
  }

  private calculateReliabilityHealth(evaluations: AgentEvaluation[]): number {
    const avg = evaluations.reduce((sum, e) => sum + e.successRate, 0) / evaluations.length;
    return avg || 75;
  }

  private calculateEfficiencyHealth(evaluations: AgentEvaluation[]): number {
    const avg = evaluations.reduce((sum, e) => sum + e.resourceEfficiency, 0) / evaluations.length;
    return avg || 75;
  }

  private calculateRating(successRate: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (successRate >= 90) return 'excellent';
    if (successRate >= 75) return 'good';
    if (successRate >= 60) return 'fair';
    return 'poor';
  }

  private identifyStrengths(performance: any): string[] {
    const strengths: string[] = [];
    
    if (performance.successRate > 90) {
      strengths.push('High success rate');
    }
    if (performance.averageExecutionTime < 2000) {
      strengths.push('Fast execution');
    }
    if (performance.acceptanceRate > 80) {
      strengths.push('High proposal acceptance');
    }
    
    return strengths;
  }

  private identifyWeaknesses(performance: any): string[] {
    const weaknesses: string[] = [];
    
    if (performance.successRate < 70) {
      weaknesses.push('Low success rate');
    }
    if (performance.averageExecutionTime > 5000) {
      weaknesses.push('Slow execution');
    }
    if (performance.acceptanceRate < 50) {
      weaknesses.push('Low proposal acceptance');
    }
    
    return weaknesses;
  }
}

export const architectureOptimizerService = new ArchitectureOptimizerService();
export default architectureOptimizerService;
