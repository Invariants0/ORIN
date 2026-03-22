// Evolution Orchestrator Service - Phase 21
// Main coordinator for self-evolving agent system

import logger from '../../config/logger.js';
import { AgentType } from '../../types/agent.types.js';
import {
  EvolutionStatus,
  EvolutionConfig,
  EvolutionMetrics,
  OptimizationTarget
} from '../../types/evolution.types.js';
import agentEvolutionService from './agent-evolution.service.js';
import agentFactoryService from './agent-factory.service.js';
import metaLearningService from './meta-learning.service.js';
import architectureOptimizerService from './architecture-optimizer.service.js';
import safetyControllerService from './safety-controller.service.js';
import selfOptimizationService from './self-optimization.service.js';

class EvolutionOrchestratorService {
  private config: EvolutionConfig;
  private metrics: EvolutionMetrics;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private checkpointInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: true,
      autoOptimize: true,
      optimizationInterval: 60 * 60 * 1000, // 1 hour
      safetyConstraints: {
        maxAgentsPerType: 10,
        maxTotalAgents: 50,
        maxTemporaryAgents: 20,
        creationRateLimit: {
          count: 5,
          period: 60 * 60 * 1000
        },
        resourceLimits: {
          memoryPerAgent: 100,
          cpuPerAgent: 10,
          totalMemory: 2048,
          totalCpu: 80
        },
        authorityConstraints: {
          newAgentAuthority: 'read_only' as any,
          promotionRequiresApproval: true,
          criticalActionsRequireOversight: true,
          autoDemoteOnFailures: 5
        }
      },
      requireHumanApproval: true,
      approvalThreshold: {
        agentCreation: true,
        strategyChange: false,
        architectureChange: true,
        authorityChange: true
      },
      checkpointInterval: 30 * 60 * 1000, // 30 minutes
      maxCheckpoints: 10
    };

    this.metrics = {
      totalEvolutions: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      rolledBackEvolutions: 0,
      agentsCreated: 0,
      agentsRemoved: 0,
      strategiesOptimized: 0,
      performanceImprovement: 0,
      resourceEfficiencyGain: 0,
      averageOptimizationTime: 0
    };
  }

  /**
   * Initialize evolution system
   */
  async initialize(): Promise<void> {
    logger.info('[EvolutionOrchestrator] Initializing Phase 21: Self-Evolving Agent System...');

    try {
      // Initialize all evolution components
      await agentEvolutionService.initialize();
      await agentFactoryService.initialize();
      await metaLearningService.initialize();
      await architectureOptimizerService.initialize();
      await safetyControllerService.initialize();
      await selfOptimizationService.initialize();

      // Start automatic optimization if enabled
      if (this.config.autoOptimize) {
        this.startAutoOptimization();
      }

      // Start automatic checkpointing
      this.startAutoCheckpointing();

      logger.info('[EvolutionOrchestrator] Phase 21 initialized successfully');
      logger.info('[EvolutionOrchestrator] System is now self-evolving');

    } catch (error: any) {
      logger.error('[EvolutionOrchestrator] Failed to initialize', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Run complete optimization cycle
   */
  async runOptimizationCycle(): Promise<{
    success: boolean;
    improvements: Record<string, number>;
    newAgents: number;
    optimizedStrategies: number;
  }> {
    logger.info('[EvolutionOrchestrator] Running optimization cycle...');

    const startTime = Date.now();
    const improvements: Record<string, number> = {};
    let newAgents = 0;
    let optimizedStrategies = 0;

    try {
      // Step 1: Meta-learning - detect patterns and generate insights
      logger.info('[EvolutionOrchestrator] Step 1: Meta-learning analysis');
      const patterns = await metaLearningService.detectPatterns();
      const insights = await metaLearningService.generateInsights();
      
      logger.info('[EvolutionOrchestrator] Patterns detected', { count: patterns.length });
      logger.info('[EvolutionOrchestrator] Insights generated', { count: insights.length });

      // Step 2: Agent evolution - optimize existing agents
      logger.info('[EvolutionOrchestrator] Step 2: Agent evolution');
      for (const agentType of Object.values(AgentType)) {
        const optimization = await agentEvolutionService.optimizeAgent(agentType);
        
        if (optimization && optimization.confidence > 70) {
          const applied = await agentEvolutionService.applyOptimization(optimization);
          if (applied) {
            optimizedStrategies++;
            improvements[`${agentType}_strategy`] = optimization.expectedImprovement;
          }
        }
      }

      // Step 3: Dynamic agent creation - create agents for patterns
      logger.info('[EvolutionOrchestrator] Step 3: Dynamic agent creation');
      for (const pattern of patterns) {
        if (pattern.frequency > 5 && pattern.confidence > 75) {
          // Check if creation is allowed
          const allowed = await safetyControllerService.checkEvolutionAllowed({
            type: 'create_agent',
            target: pattern.name,
            parameters: { pattern },
            requestedBy: 'system'
          });

          if (allowed.allowed && !allowed.requiresApproval) {
            const spec = await agentFactoryService.generateAgentSpec({
              name: pattern.name,
              category: pattern.category,
              frequency: pattern.frequency,
              context: {}
            });

            await agentFactoryService.createAgent(spec);
            newAgents++;
            this.metrics.agentsCreated++;
          }
        }
      }

      // Step 4: Architecture optimization
      logger.info('[EvolutionOrchestrator] Step 4: Architecture optimization');
      const evaluation = await architectureOptimizerService.evaluateArchitecture();
      
      improvements.architecture_score = evaluation.overallScore;
      improvements.coordination_health = evaluation.systemHealth.coordination;
      improvements.performance_health = evaluation.systemHealth.performance;

      // Step 5: Self-optimization
      logger.info('[EvolutionOrchestrator] Step 5: Self-optimization');
      
      const targets: OptimizationTarget[] = [
        {
          targetId: 'coord_latency',
          name: 'Coordination Latency',
          metric: 'coordinationLatency',
          currentValue: 150,
          targetValue: 100,
          priority: 'high'
        },
        {
          targetId: 'decision_accuracy',
          name: 'Decision Accuracy',
          metric: 'decisionAccuracy',
          currentValue: 85,
          targetValue: 95,
          priority: 'high'
        }
      ];

      const cycle = await selfOptimizationService.runOptimizationCycle(targets);
      
      Object.assign(improvements, cycle.results.improvements);

      // Step 6: Safety check and checkpoint
      logger.info('[EvolutionOrchestrator] Step 6: Safety check');
      await safetyControllerService.enforceResourceLimits();
      await safetyControllerService.createCheckpoint('system', 'Post-optimization checkpoint');

      // Update metrics
      this.metrics.totalEvolutions++;
      this.metrics.successfulEvolutions++;
      this.metrics.strategiesOptimized += optimizedStrategies;
      
      const duration = Date.now() - startTime;
      this.metrics.averageOptimizationTime = 
        (this.metrics.averageOptimizationTime * (this.metrics.totalEvolutions - 1) + duration) / 
        this.metrics.totalEvolutions;

      logger.info('[EvolutionOrchestrator] Optimization cycle completed', {
        duration: `${duration}ms`,
        newAgents,
        optimizedStrategies,
        improvements: Object.keys(improvements).length
      });

      return {
        success: true,
        improvements,
        newAgents,
        optimizedStrategies
      };

    } catch (error: any) {
      logger.error('[EvolutionOrchestrator] Optimization cycle failed', {
        error: error.message
      });

      this.metrics.failedEvolutions++;

      return {
        success: false,
        improvements,
        newAgents,
        optimizedStrategies
      };
    }
  }

  /**
   * Learn from outcome
   */
  async learnFromOutcome(outcome: {
    agentType: AgentType;
    proposalId: string;
    success: boolean;
    executionTime: number;
    confidence: number;
    context: Record<string, any>;
  }): Promise<void> {
    // Record in agent evolution
    await agentEvolutionService.recordOutcome(
      outcome.agentType,
      {
        id: outcome.proposalId,
        agentType: outcome.agentType,
        action: 'unknown',
        reasoning: '',
        confidence: outcome.confidence,
        priority: 'medium' as any,
        expectedOutcome: '',
        risks: [],
        requiredResources: [],
        estimatedDuration: outcome.executionTime,
        dependencies: [],
        createdAt: new Date()
      },
      {
        success: outcome.success,
        executionTime: outcome.executionTime
      }
    );

    // Track in meta-learning
    await metaLearningService.trackAgentPerformance(outcome.agentType, {
      proposalId: outcome.proposalId,
      success: outcome.success,
      executionTime: outcome.executionTime,
      confidence: outcome.confidence,
      context: outcome.context
    });
  }

  /**
   * Get evolution status
   */
  getStatus(): EvolutionStatus {
    const safetyStatus = safetyControllerService.getSafetyStatus();
    const currentCycle = selfOptimizationService.getCurrentCycle();
    const dynamicAgents = agentFactoryService.getDynamicAgents();
    const creationStats = agentFactoryService.getCreationStats();

    return {
      enabled: this.config.enabled,
      mode: currentCycle ? 'optimizing' : 'learning',
      currentCycle,
      totalAgents: Object.keys(AgentType).length + dynamicAgents.length,
      dynamicAgents: dynamicAgents.length,
      temporaryAgents: creationStats.temporaryAgents,
      activeOptimizations: currentCycle ? currentCycle.targets.length : 0,
      pendingActions: 0,
      safetyStatus: safetyStatus.status,
      lastCheckpoint: safetyStatus.lastCheckpoint || new Date(),
      systemHealth: {
        overall: 85,
        evolution: 90,
        safety: safetyStatus.status === 'healthy' ? 100 : safetyStatus.status === 'warning' ? 70 : 40,
        performance: 85
      }
    };
  }

  /**
   * Get evolution metrics
   */
  getMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get configuration
   */
  getConfig(): EvolutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...updates };
    
    logger.info('[EvolutionOrchestrator] Configuration updated', updates);

    // Restart intervals if needed
    if (updates.autoOptimize !== undefined || updates.optimizationInterval) {
      this.stopAutoOptimization();
      if (this.config.autoOptimize) {
        this.startAutoOptimization();
      }
    }
  }

  /**
   * Shutdown evolution system
   */
  async shutdown(): Promise<void> {
    logger.info('[EvolutionOrchestrator] Shutting down...');

    this.stopAutoOptimization();
    this.stopAutoCheckpointing();

    // Create final checkpoint
    await safetyControllerService.createCheckpoint('system', 'Shutdown checkpoint');

    logger.info('[EvolutionOrchestrator] Shut down successfully');
  }

  // ==================== PRIVATE METHODS ====================

  private startAutoOptimization(): void {
    logger.info('[EvolutionOrchestrator] Starting auto-optimization', {
      interval: `${this.config.optimizationInterval / 1000}s`
    });

    this.optimizationInterval = setInterval(async () => {
      await this.runOptimizationCycle();
    }, this.config.optimizationInterval);
  }

  private stopAutoOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      logger.info('[EvolutionOrchestrator] Auto-optimization stopped');
    }
  }

  private startAutoCheckpointing(): void {
    logger.info('[EvolutionOrchestrator] Starting auto-checkpointing', {
      interval: `${this.config.checkpointInterval / 1000}s`
    });

    this.checkpointInterval = setInterval(async () => {
      await safetyControllerService.createCheckpoint('system', 'Automatic checkpoint');
    }, this.config.checkpointInterval);
  }

  private stopAutoCheckpointing(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
      logger.info('[EvolutionOrchestrator] Auto-checkpointing stopped');
    }
  }
}

export const evolutionOrchestratorService = new EvolutionOrchestratorService();
export default evolutionOrchestratorService;
