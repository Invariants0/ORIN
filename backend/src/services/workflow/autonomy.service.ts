import logger from '@/config/logger.js';
import {
  AutonomyLevel,
  AutonomyConfig,
  ActionType,
  DecisionInput
} from '@/types/autonomy.types.js';
import { decisionEngineService } from '@/services/ai/decision-engine.service.js';
import { actionExecutorService } from '@/services/workflow/action-executor.service.js';
import { policyEngineService } from '@/services/infrastructure/policy-engine.service.js';

/**
 * Autonomy Service
 * Main orchestrator for semi-autonomous system
 */
export class AutonomyService {
  private userConfigs: Map<string, AutonomyConfig> = new Map();

  /**
   * Initialize autonomy for user
   */
  initializeUser(userId: string, level: AutonomyLevel = AutonomyLevel.ASSISTED): AutonomyConfig {
    const config = this.createDefaultConfig(userId, level);
    this.userConfigs.set(userId, config);
    logger.info('User autonomy initialized', { userId, level });
    return config;
  }

  /**
   * Create default config based on autonomy level
   */
  private createDefaultConfig(userId: string, level: AutonomyLevel): AutonomyConfig {
    const baseConfig: AutonomyConfig = {
      userId,
      level,
      confidenceThreshold: 70,
      allowedActions: [],
      blockedActions: [],
      maxRetries: 3,
      pauseThreshold: 0.5
    };

    switch (level) {
      case AutonomyLevel.MANUAL:
        return {
          ...baseConfig,
          confidenceThreshold: 100, // Never auto-execute
          allowedActions: [],
          blockedActions: Object.values(ActionType)
        };

      case AutonomyLevel.ASSISTED:
        return {
          ...baseConfig,
          confidenceThreshold: 90, // Very high bar
          allowedActions: [ActionType.ALERT_USER],
          blockedActions: [
            ActionType.CANCEL_WORKFLOW,
            ActionType.SCALE_RESOURCES
          ]
        };

      case AutonomyLevel.SEMI_AUTO:
        return {
          ...baseConfig,
          confidenceThreshold: 75,
          allowedActions: [
            ActionType.RETRY_WORKFLOW,
            ActionType.PAUSE_WORKFLOW,
            ActionType.RESUME_WORKFLOW,
            ActionType.ALERT_USER
          ],
          blockedActions: [
            ActionType.CANCEL_WORKFLOW
          ]
        };

      case AutonomyLevel.AUTO:
        return {
          ...baseConfig,
          confidenceThreshold: 60,
          allowedActions: Object.values(ActionType),
          blockedActions: [] // User trusts full automation
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Process autonomous decision-making cycle
   */
  async processAutonomousCycle(userId: string, input: DecisionInput) {
    const config = this.userConfigs.get(userId);
    
    if (!config) {
      throw new Error('User autonomy not initialized');
    }

    logger.info('Processing autonomous cycle', { 
      userId, 
      level: config.level 
    });

    try {
      // Step 1: Make decision
      const decision = await decisionEngineService.makeDecision(input);

      // Step 2: Validate against policies
      const validation = policyEngineService.validateDecision(decision, input);

      // Step 3: Execute if allowed
      const execution = await actionExecutorService.executeDecision(
        decision,
        config,
        input
      );

      return {
        decision,
        validation,
        execution
      };

    } catch (error: any) {
      logger.error('Autonomous cycle failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update user autonomy level
   */
  updateAutonomyLevel(userId: string, level: AutonomyLevel): AutonomyConfig {
    const existingConfig = this.userConfigs.get(userId);
    
    if (!existingConfig) {
      return this.initializeUser(userId, level);
    }

    const newConfig = this.createDefaultConfig(userId, level);
    this.userConfigs.set(userId, newConfig);

    logger.info('Autonomy level updated', { userId, oldLevel: existingConfig.level, newLevel: level });

    return newConfig;
  }

  /**
   * Update user config
   */
  updateConfig(userId: string, updates: Partial<AutonomyConfig>): AutonomyConfig {
    const config = this.userConfigs.get(userId);
    
    if (!config) {
      throw new Error('User autonomy not initialized');
    }

    const updatedConfig = { ...config, ...updates };
    this.userConfigs.set(userId, updatedConfig);

    logger.info('User config updated', { userId, updates });

    return updatedConfig;
  }

  /**
   * Get user config
   */
  getConfig(userId: string): AutonomyConfig | undefined {
    return this.userConfigs.get(userId);
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      activeUsers: this.userConfigs.size,
      decisionHistory: decisionEngineService.getHistory(10),
      executionHistory: actionExecutorService.getHistory(10),
      policies: policyEngineService.getPolicies(),
      timestamp: new Date()
    };
  }

  /**
   * Emergency stop - disable all automation
   */
  emergencyStop(userId: string): void {
    const config = this.userConfigs.get(userId);
    
    if (config) {
      config.level = AutonomyLevel.MANUAL;
      config.blockedActions = Object.values(ActionType);
      logger.warn('Emergency stop activated', { userId });
    }
  }

  /**
   * Get autonomy recommendations
   */
  getRecommendations(userId: string): {
    currentLevel: AutonomyLevel;
    recommendedLevel: AutonomyLevel;
    reason: string;
  } {
    const config = this.userConfigs.get(userId);
    
    if (!config) {
      return {
        currentLevel: AutonomyLevel.MANUAL,
        recommendedLevel: AutonomyLevel.ASSISTED,
        reason: 'Start with assisted mode to build trust'
      };
    }

    // Analyze user behavior and system performance
    const executionHistory = actionExecutorService.getHistory(50);
    const successRate = this.calculateSuccessRate(executionHistory);
    const interventionRate = 0.2; // TODO: Calculate from actual data

    // Recommend level based on performance
    if (successRate > 0.9 && interventionRate < 0.1) {
      return {
        currentLevel: config.level,
        recommendedLevel: AutonomyLevel.AUTO,
        reason: 'High success rate and low intervention - ready for full automation'
      };
    } else if (successRate > 0.8 && interventionRate < 0.3) {
      return {
        currentLevel: config.level,
        recommendedLevel: AutonomyLevel.SEMI_AUTO,
        reason: 'Good performance - ready for semi-autonomous mode'
      };
    } else {
      return {
        currentLevel: config.level,
        recommendedLevel: AutonomyLevel.ASSISTED,
        reason: 'Building confidence - stay in assisted mode'
      };
    }
  }

  /**
   * Calculate success rate from execution history
   */
  private calculateSuccessRate(executions: any[]): number {
    if (executions.length === 0) return 0;
    
    const successful = executions.filter(e => 
      e.status === 'executed' || e.status === 'approved'
    ).length;
    
    return successful / executions.length;
  }
}

export const autonomyService = new AutonomyService();
