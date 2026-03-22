// Agent Evolution Service - Phase 21
// Enables agents to improve themselves over time

import logger from '../../config/logger.js';
import {
  AgentType,
  AgentProposal,
  CoordinationDecision
} from '../../types/agent.types.js';
import {
  AgentEvolutionStrategy,
  AgentPerformanceMetrics,
  StrategyOptimization,
  ThresholdTuning
} from '../../types/evolution.types.js';

class AgentEvolutionService {
  private strategies: Map<AgentType, AgentEvolutionStrategy[]> = new Map();
  private performanceMetrics: Map<AgentType, AgentPerformanceMetrics> = new Map();
  private evolutionHistory: Map<AgentType, any[]> = new Map();

  async initialize(): Promise<void> {
    logger.info('[AgentEvolution] Initializing...');

    // Initialize default strategies for each agent type
    for (const agentType of Object.values(AgentType)) {
      await this.initializeAgentStrategies(agentType);
      await this.initializePerformanceMetrics(agentType);
    }

    logger.info('[AgentEvolution] Initialized successfully');
  }

  /**
   * Record outcome of agent proposal
   */
  async recordOutcome(
    agentType: AgentType,
    proposal: AgentProposal,
    outcome: {
      success: boolean;
      executionTime: number;
      error?: string;
      impact?: Record<string, number>;
    }
  ): Promise<void> {
    logger.debug('[AgentEvolution] Recording outcome', {
      agentType,
      proposalId: proposal.id,
      success: outcome.success
    });

    // Update performance metrics
    const metrics = this.performanceMetrics.get(agentType);
    if (metrics) {
      metrics.totalProposals++;
      
      if (outcome.success) {
        metrics.successfulExecutions++;
      } else {
        metrics.failedExecutions++;
      }

      // Update averages
      metrics.averageExecutionTime = 
        (metrics.averageExecutionTime * (metrics.totalProposals - 1) + outcome.executionTime) / 
        metrics.totalProposals;

      metrics.averageConfidence = 
        (metrics.averageConfidence * (metrics.totalProposals - 1) + proposal.confidence) / 
        metrics.totalProposals;

      metrics.successRate = 
        (metrics.successfulExecutions / metrics.totalProposals) * 100;

      metrics.lastUpdated = new Date();

      this.performanceMetrics.set(agentType, metrics);
    }

    // Record in history
    const history = this.evolutionHistory.get(agentType) || [];
    history.push({
      timestamp: new Date(),
      proposal,
      outcome
    });
    
    // Keep last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    this.evolutionHistory.set(agentType, history);

    // Trigger optimization if needed
    if (metrics && metrics.totalProposals % 10 === 0) {
      await this.considerOptimization(agentType);
    }
  }

  /**
   * Optimize agent strategy based on performance
   */
  async optimizeAgent(agentType: AgentType): Promise<StrategyOptimization | null> {
    logger.info('[AgentEvolution] Optimizing agent', { agentType });

    const metrics = this.performanceMetrics.get(agentType);
    if (!metrics || metrics.totalProposals < 10) {
      logger.debug('[AgentEvolution] Insufficient data for optimization', { agentType });
      return null;
    }

    const currentStrategy = this.getCurrentStrategy(agentType);
    if (!currentStrategy) {
      logger.warn('[AgentEvolution] No current strategy found', { agentType });
      return null;
    }

    // Analyze performance and propose improvements
    const proposedStrategy = await this.proposeStrategyImprovement(
      agentType,
      currentStrategy,
      metrics
    );

    if (!proposedStrategy) {
      logger.debug('[AgentEvolution] No improvement found', { agentType });
      return null;
    }

    const optimization: StrategyOptimization = {
      agentType,
      currentStrategy,
      proposedStrategy,
      expectedImprovement: this.calculateExpectedImprovement(currentStrategy, proposedStrategy),
      confidence: this.calculateOptimizationConfidence(metrics),
      reasoning: this.buildOptimizationReasoning(currentStrategy, proposedStrategy, metrics),
      risks: this.identifyOptimizationRisks(proposedStrategy)
    };

    logger.info('[AgentEvolution] Optimization proposed', {
      agentType,
      expectedImprovement: optimization.expectedImprovement,
      confidence: optimization.confidence
    });

    return optimization;
  }

  /**
   * Apply strategy optimization
   */
  async applyOptimization(optimization: StrategyOptimization): Promise<boolean> {
    logger.info('[AgentEvolution] Applying optimization', {
      agentType: optimization.agentType,
      strategyId: optimization.proposedStrategy.strategyId
    });

    try {
      const strategies = this.strategies.get(optimization.agentType) || [];
      
      // Disable current strategy
      const currentIndex = strategies.findIndex(
        s => s.strategyId === optimization.currentStrategy.strategyId
      );
      if (currentIndex >= 0) {
        strategies[currentIndex].enabled = false;
      }

      // Add new strategy
      strategies.push(optimization.proposedStrategy);
      this.strategies.set(optimization.agentType, strategies);

      logger.info('[AgentEvolution] Optimization applied successfully', {
        agentType: optimization.agentType
      });

      return true;
    } catch (error: any) {
      logger.error('[AgentEvolution] Failed to apply optimization', {
        error: error.message,
        agentType: optimization.agentType
      });
      return false;
    }
  }

  /**
   * Tune agent thresholds based on performance
   */
  async tuneThresholds(
    agentType: AgentType,
    targetMetrics: {
      confidenceThreshold?: number;
      riskTolerance?: number;
      priorityWeight?: number;
      timeoutMultiplier?: number;
    }
  ): Promise<ThresholdTuning | null> {
    logger.info('[AgentEvolution] Tuning thresholds', { agentType, targetMetrics });

    const beforeMetrics = this.performanceMetrics.get(agentType);
    if (!beforeMetrics) {
      logger.warn('[AgentEvolution] No metrics found for agent', { agentType });
      return null;
    }

    // Apply threshold changes
    const currentStrategy = this.getCurrentStrategy(agentType);
    if (!currentStrategy) {
      return null;
    }

    // Update strategy parameters
    if (targetMetrics.confidenceThreshold !== undefined) {
      currentStrategy.parameters.confidenceThreshold = targetMetrics.confidenceThreshold;
    }
    if (targetMetrics.riskTolerance !== undefined) {
      currentStrategy.parameters.riskTolerance = targetMetrics.riskTolerance;
    }
    if (targetMetrics.priorityWeight !== undefined) {
      currentStrategy.parameters.priorityWeight = targetMetrics.priorityWeight;
    }
    if (targetMetrics.timeoutMultiplier !== undefined) {
      currentStrategy.parameters.timeoutMultiplier = targetMetrics.timeoutMultiplier;
    }

    // Simulate after metrics (in real system, would measure actual impact)
    const afterMetrics = { ...beforeMetrics };
    const improvement = this.estimateThresholdImpact(targetMetrics, beforeMetrics);

    const tuning: ThresholdTuning = {
      agentType,
      thresholds: {
        confidenceThreshold: targetMetrics.confidenceThreshold || currentStrategy.parameters.confidenceThreshold,
        riskTolerance: targetMetrics.riskTolerance || currentStrategy.parameters.riskTolerance,
        priorityWeight: targetMetrics.priorityWeight || currentStrategy.parameters.priorityWeight,
        timeoutMultiplier: targetMetrics.timeoutMultiplier || currentStrategy.parameters.timeoutMultiplier
      },
      performanceImpact: {
        before: beforeMetrics,
        after: afterMetrics,
        improvement
      }
    };

    logger.info('[AgentEvolution] Thresholds tuned', {
      agentType,
      improvement
    });

    return tuning;
  }

  /**
   * Get agent performance metrics
   */
  getAgentPerformance(agentType: AgentType): AgentPerformanceMetrics | null {
    return this.performanceMetrics.get(agentType) || null;
  }

  /**
   * Get all agent performances
   */
  getAllPerformances(): Map<AgentType, AgentPerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Get agent strategies
   */
  getAgentStrategies(agentType: AgentType): AgentEvolutionStrategy[] {
    return this.strategies.get(agentType) || [];
  }

  /**
   * Get current active strategy
   */
  getCurrentStrategy(agentType: AgentType): AgentEvolutionStrategy | null {
    const strategies = this.strategies.get(agentType) || [];
    return strategies.find(s => s.enabled) || null;
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeAgentStrategies(agentType: AgentType): Promise<void> {
    const defaultStrategy: AgentEvolutionStrategy = {
      strategyId: `${agentType}_default`,
      agentType,
      name: 'Default Strategy',
      description: 'Initial strategy for agent',
      parameters: {
        confidenceThreshold: 0.7,
        riskTolerance: 0.5,
        priorityWeight: 1.0,
        timeoutMultiplier: 1.0
      },
      successRate: 0,
      usageCount: 0,
      lastUsed: new Date(),
      enabled: true
    };

    this.strategies.set(agentType, [defaultStrategy]);
  }

  private async initializePerformanceMetrics(agentType: AgentType): Promise<void> {
    const metrics: AgentPerformanceMetrics = {
      agentType,
      totalProposals: 0,
      acceptedProposals: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageConfidence: 0,
      averageExecutionTime: 0,
      successRate: 0,
      acceptanceRate: 0,
      resourceUsage: {
        memory: 0,
        cpu: 0
      },
      lastUpdated: new Date()
    };

    this.performanceMetrics.set(agentType, metrics);
  }

  private async considerOptimization(agentType: AgentType): Promise<void> {
    const metrics = this.performanceMetrics.get(agentType);
    if (!metrics) return;

    // Trigger optimization if success rate is low
    if (metrics.successRate < 70 && metrics.totalProposals >= 20) {
      logger.info('[AgentEvolution] Low success rate detected, triggering optimization', {
        agentType,
        successRate: metrics.successRate
      });
      await this.optimizeAgent(agentType);
    }
  }

  private async proposeStrategyImprovement(
    agentType: AgentType,
    currentStrategy: AgentEvolutionStrategy,
    metrics: AgentPerformanceMetrics
  ): Promise<AgentEvolutionStrategy | null> {
    // Analyze what needs improvement
    const improvements: Record<string, number> = {};

    if (metrics.successRate < 80) {
      // Lower confidence threshold to be more selective
      improvements.confidenceThreshold = Math.min(
        currentStrategy.parameters.confidenceThreshold + 0.05,
        0.95
      );
    }

    if (metrics.averageExecutionTime > 5000) {
      // Reduce timeout multiplier
      improvements.timeoutMultiplier = Math.max(
        currentStrategy.parameters.timeoutMultiplier - 0.1,
        0.5
      );
    }

    if (Object.keys(improvements).length === 0) {
      return null;
    }

    // Create improved strategy
    const improvedStrategy: AgentEvolutionStrategy = {
      strategyId: `${agentType}_optimized_${Date.now()}`,
      agentType,
      name: 'Optimized Strategy',
      description: 'Strategy optimized based on performance data',
      parameters: {
        ...currentStrategy.parameters,
        ...improvements
      },
      successRate: 0,
      usageCount: 0,
      lastUsed: new Date(),
      enabled: true
    };

    return improvedStrategy;
  }

  private calculateExpectedImprovement(
    current: AgentEvolutionStrategy,
    proposed: AgentEvolutionStrategy
  ): number {
    // Calculate expected improvement percentage
    let improvement = 0;

    // Compare parameters
    const paramDiff = Object.keys(proposed.parameters).reduce((sum, key) => {
      const diff = Math.abs(proposed.parameters[key] - current.parameters[key]);
      return sum + diff;
    }, 0);

    improvement = Math.min(paramDiff * 10, 30); // Cap at 30%

    return improvement;
  }

  private calculateOptimizationConfidence(metrics: AgentPerformanceMetrics): number {
    // Higher confidence with more data
    const dataConfidence = Math.min(metrics.totalProposals / 50, 1) * 50;
    
    // Higher confidence if success rate is consistent
    const consistencyConfidence = metrics.successRate > 50 ? 30 : 10;
    
    return dataConfidence + consistencyConfidence;
  }

  private buildOptimizationReasoning(
    current: AgentEvolutionStrategy,
    proposed: AgentEvolutionStrategy,
    metrics: AgentPerformanceMetrics
  ): string {
    const reasons: string[] = [];

    if (metrics.successRate < 80) {
      reasons.push(`Success rate is ${metrics.successRate.toFixed(1)}%, below target of 80%`);
    }

    if (metrics.averageExecutionTime > 5000) {
      reasons.push(`Average execution time is ${metrics.averageExecutionTime}ms, above target`);
    }

    // Compare parameters
    Object.keys(proposed.parameters).forEach(key => {
      if (proposed.parameters[key] !== current.parameters[key]) {
        reasons.push(
          `Adjusted ${key} from ${current.parameters[key]} to ${proposed.parameters[key]}`
        );
      }
    });

    return reasons.join('. ');
  }

  private identifyOptimizationRisks(strategy: AgentEvolutionStrategy): string[] {
    const risks: string[] = [];

    if (strategy.parameters.confidenceThreshold > 0.9) {
      risks.push('Very high confidence threshold may reject too many proposals');
    }

    if (strategy.parameters.riskTolerance < 0.2) {
      risks.push('Very low risk tolerance may prevent necessary actions');
    }

    if (strategy.parameters.timeoutMultiplier < 0.7) {
      risks.push('Low timeout multiplier may cause premature timeouts');
    }

    return risks;
  }

  private estimateThresholdImpact(
    thresholds: Record<string, number>,
    metrics: AgentPerformanceMetrics
  ): number {
    // Estimate improvement based on threshold changes
    let improvement = 0;

    if (thresholds.confidenceThreshold && thresholds.confidenceThreshold > 0.8) {
      improvement += 5; // Higher confidence should improve success rate
    }

    if (thresholds.riskTolerance && thresholds.riskTolerance < 0.4) {
      improvement += 3; // Lower risk tolerance should improve reliability
    }

    return improvement;
  }
}

export const agentEvolutionService = new AgentEvolutionService();
export default agentEvolutionService;
