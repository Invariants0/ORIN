// Meta-Learning Service - Phase 21
// System-wide intelligence and cross-agent learning

import logger from '../../config/logger.js';
import { AgentType } from '../../types/agent.types.js';
import {
  MetaLearningPattern,
  CrossAgentInsight,
  BestPractice,
  KnowledgeTransfer,
  PatternExample,
  InsightEvidence
} from '../../types/evolution.types.js';

class MetaLearningService {
  private patterns: Map<string, MetaLearningPattern> = new Map();
  private insights: Map<string, CrossAgentInsight> = new Map();
  private bestPractices: Map<string, BestPractice> = new Map();
  private knowledgeTransfers: KnowledgeTransfer[] = [];
  private agentPerformanceHistory: Map<AgentType, any[]> = new Map();

  async initialize(): Promise<void> {
    logger.info('[MetaLearning] Initializing...');
    
    // Initialize pattern detection
    this.startPatternDetection();
    
    logger.info('[MetaLearning] Initialized successfully');
  }

  /**
   * Track agent performance for meta-learning
   */
  async trackAgentPerformance(
    agentType: AgentType,
    metrics: {
      proposalId: string;
      success: boolean;
      executionTime: number;
      confidence: number;
      context: Record<string, any>;
    }
  ): Promise<void> {
    const history = this.agentPerformanceHistory.get(agentType) || [];
    history.push({
      timestamp: new Date(),
      ...metrics
    });
    
    // Keep last 200 entries
    if (history.length > 200) {
      history.shift();
    }
    
    this.agentPerformanceHistory.set(agentType, history);

    // Trigger pattern detection periodically
    if (history.length % 20 === 0) {
      await this.detectPatterns();
    }
  }

  /**
   * Detect patterns across agents
   */
  async detectPatterns(): Promise<MetaLearningPattern[]> {
    logger.debug('[MetaLearning] Detecting patterns...');

    const newPatterns: MetaLearningPattern[] = [];

    // Analyze failure patterns
    const failurePatterns = await this.detectFailurePatterns();
    newPatterns.push(...failurePatterns);

    // Analyze success patterns
    const successPatterns = await this.detectSuccessPatterns();
    newPatterns.push(...successPatterns);

    // Analyze optimization opportunities
    const optimizationPatterns = await this.detectOptimizationPatterns();
    newPatterns.push(...optimizationPatterns);

    // Store new patterns
    newPatterns.forEach(pattern => {
      this.patterns.set(pattern.patternId, pattern);
    });

    if (newPatterns.length > 0) {
      logger.info('[MetaLearning] Patterns detected', { count: newPatterns.length });
    }

    return newPatterns;
  }

  /**
   * Generate cross-agent insights
   */
  async generateInsights(): Promise<CrossAgentInsight[]> {
    logger.debug('[MetaLearning] Generating insights...');

    const insights: CrossAgentInsight[] = [];

    // Compare agent performances
    const performanceInsights = await this.analyzeAgentPerformances();
    insights.push(...performanceInsights);

    // Identify coordination improvements
    const coordinationInsights = await this.analyzeCoordination();
    insights.push(...coordinationInsights);

    // Store insights
    insights.forEach(insight => {
      this.insights.set(insight.insightId, insight);
    });

    logger.info('[MetaLearning] Insights generated', { count: insights.length });

    return insights;
  }

  /**
   * Identify best strategies across agents
   */
  async identifyBestStrategies(): Promise<BestPractice[]> {
    logger.debug('[MetaLearning] Identifying best strategies...');

    const practices: BestPractice[] = [];

    // Analyze successful approaches
    for (const [agentType, history] of this.agentPerformanceHistory.entries()) {
      const successful = history.filter(h => h.success);
      
      if (successful.length > 10) {
        // Find common patterns in successful executions
        const commonContext = this.findCommonContext(successful);
        
        if (Object.keys(commonContext).length > 0) {
          const practice: BestPractice = {
            practiceId: `bp_${agentType}_${Date.now()}`,
            name: `${agentType} Success Pattern`,
            description: `Successful approach identified for ${agentType}`,
            category: 'strategy',
            applicableAgents: [agentType],
            successRate: (successful.length / history.length) * 100,
            adoptionRate: 0,
            discoveredAt: new Date(),
            validatedBy: [agentType],
            examples: successful.slice(0, 3).map(s => s.proposalId)
          };
          
          practices.push(practice);
          this.bestPractices.set(practice.practiceId, practice);
        }
      }
    }

    logger.info('[MetaLearning] Best practices identified', { count: practices.length });

    return practices;
  }

  /**
   * Transfer knowledge between agents
   */
  async transferKnowledge(
    fromAgent: AgentType,
    toAgent: AgentType,
    knowledgeType: 'strategy' | 'pattern' | 'threshold' | 'best_practice',
    content: Record<string, any>
  ): Promise<KnowledgeTransfer> {
    logger.info('[MetaLearning] Transferring knowledge', {
      from: fromAgent,
      to: toAgent,
      type: knowledgeType
    });

    const transfer: KnowledgeTransfer = {
      transferId: `kt_${Date.now()}`,
      fromAgent,
      toAgent,
      knowledgeType,
      content,
      effectiveness: 0,
      transferredAt: new Date()
    };

    this.knowledgeTransfers.push(transfer);

    logger.info('[MetaLearning] Knowledge transferred', {
      transferId: transfer.transferId
    });

    return transfer;
  }

  /**
   * Get all patterns
   */
  getPatterns(): MetaLearningPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): MetaLearningPattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Get all insights
   */
  getInsights(): CrossAgentInsight[] {
    return Array.from(this.insights.values());
  }

  /**
   * Get best practices
   */
  getBestPractices(): BestPractice[] {
    return Array.from(this.bestPractices.values());
  }

  /**
   * Get knowledge transfers
   */
  getKnowledgeTransfers(): KnowledgeTransfer[] {
    return this.knowledgeTransfers;
  }

  // ==================== PRIVATE METHODS ====================

  private startPatternDetection(): void {
    // Run pattern detection every 5 minutes
    setInterval(() => {
      this.detectPatterns();
      this.generateInsights();
    }, 5 * 60 * 1000);
  }

  private async detectFailurePatterns(): Promise<MetaLearningPattern[]> {
    const patterns: MetaLearningPattern[] = [];

    for (const [agentType, history] of this.agentPerformanceHistory.entries()) {
      const failures = history.filter(h => !h.success);
      
      if (failures.length > 5) {
        // Group failures by context similarity
        const groups = this.groupByContextSimilarity(failures);
        
        for (const group of groups) {
          if (group.length >= 3) {
            const pattern: MetaLearningPattern = {
              patternId: `pattern_failure_${agentType}_${Date.now()}`,
              name: `${agentType} Failure Pattern`,
              description: `Recurring failure pattern detected for ${agentType}`,
              category: 'failure',
              frequency: group.length,
              confidence: Math.min((group.length / failures.length) * 100, 95),
              affectedAgents: [agentType],
              detectedAt: new Date(),
              lastOccurrence: group[group.length - 1].timestamp,
              examples: group.slice(0, 3).map(g => ({
                timestamp: g.timestamp,
                context: g.context,
                outcome: 'failure',
                agentType,
                proposalId: g.proposalId
              })),
              suggestedAction: 'Create specialized recovery agent or adjust strategy'
            };
            
            patterns.push(pattern);
          }
        }
      }
    }

    return patterns;
  }

  private async detectSuccessPatterns(): Promise<MetaLearningPattern[]> {
    const patterns: MetaLearningPattern[] = [];

    for (const [agentType, history] of this.agentPerformanceHistory.entries()) {
      const successes = history.filter(h => h.success && h.confidence > 80);
      
      if (successes.length > 10) {
        const pattern: MetaLearningPattern = {
          patternId: `pattern_success_${agentType}_${Date.now()}`,
          name: `${agentType} Success Pattern`,
          description: `High-confidence success pattern for ${agentType}`,
          category: 'success',
          frequency: successes.length,
          confidence: 90,
          affectedAgents: [agentType],
          detectedAt: new Date(),
          lastOccurrence: successes[successes.length - 1].timestamp,
          examples: successes.slice(0, 3).map(s => ({
            timestamp: s.timestamp,
            context: s.context,
            outcome: 'success',
            agentType,
            proposalId: s.proposalId
          })),
          suggestedAction: 'Propagate successful strategy to similar agents'
        };
        
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async detectOptimizationPatterns(): Promise<MetaLearningPattern[]> {
    const patterns: MetaLearningPattern[] = [];

    for (const [agentType, history] of this.agentPerformanceHistory.entries()) {
      // Find slow executions
      const avgTime = history.reduce((sum, h) => sum + h.executionTime, 0) / history.length;
      const slow = history.filter(h => h.executionTime > avgTime * 1.5);
      
      if (slow.length > 5) {
        const pattern: MetaLearningPattern = {
          patternId: `pattern_optimization_${agentType}_${Date.now()}`,
          name: `${agentType} Performance Bottleneck`,
          description: `Performance optimization opportunity for ${agentType}`,
          category: 'optimization',
          frequency: slow.length,
          confidence: 75,
          affectedAgents: [agentType],
          detectedAt: new Date(),
          lastOccurrence: slow[slow.length - 1].timestamp,
          examples: slow.slice(0, 3).map(s => ({
            timestamp: s.timestamp,
            context: s.context,
            outcome: 'success',
            agentType,
            proposalId: s.proposalId
          })),
          suggestedAction: 'Optimize execution strategy or create performance specialist'
        };
        
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async analyzeAgentPerformances(): Promise<CrossAgentInsight[]> {
    const insights: CrossAgentInsight[] = [];

    // Compare success rates across agents
    const performances = Array.from(this.agentPerformanceHistory.entries()).map(([type, history]) => ({
      agentType: type,
      successRate: history.filter(h => h.success).length / history.length,
      avgExecutionTime: history.reduce((sum, h) => sum + h.executionTime, 0) / history.length,
      totalExecutions: history.length
    }));

    // Find best and worst performers
    const sorted = performances.sort((a, b) => b.successRate - a.successRate);
    
    if (sorted.length >= 2 && sorted[0].successRate - sorted[sorted.length - 1].successRate > 0.2) {
      const insight: CrossAgentInsight = {
        insightId: `insight_performance_${Date.now()}`,
        type: 'performance',
        title: 'Performance Gap Detected',
        description: `${sorted[0].agentType} outperforms ${sorted[sorted.length - 1].agentType} by ${((sorted[0].successRate - sorted[sorted.length - 1].successRate) * 100).toFixed(1)}%`,
        affectedAgents: [sorted[0].agentType, sorted[sorted.length - 1].agentType],
        impact: 'high',
        confidence: 85,
        evidence: [
          {
            source: sorted[0].agentType,
            metric: 'successRate',
            value: sorted[0].successRate,
            timestamp: new Date(),
            context: {}
          },
          {
            source: sorted[sorted.length - 1].agentType,
            metric: 'successRate',
            value: sorted[sorted.length - 1].successRate,
            timestamp: new Date(),
            context: {}
          }
        ],
        recommendations: [
          `Transfer successful strategies from ${sorted[0].agentType} to ${sorted[sorted.length - 1].agentType}`,
          `Review and optimize ${sorted[sorted.length - 1].agentType} decision criteria`
        ],
        createdAt: new Date()
      };
      
      insights.push(insight);
    }

    return insights;
  }

  private async analyzeCoordination(): Promise<CrossAgentInsight[]> {
    // Placeholder for coordination analysis
    return [];
  }

  private groupByContextSimilarity(items: any[]): any[][] {
    const groups: any[][] = [];
    
    for (const item of items) {
      let added = false;
      
      for (const group of groups) {
        if (this.isSimilarContext(item.context, group[0].context)) {
          group.push(item);
          added = true;
          break;
        }
      }
      
      if (!added) {
        groups.push([item]);
      }
    }
    
    return groups;
  }

  private isSimilarContext(ctx1: Record<string, any>, ctx2: Record<string, any>): boolean {
    const keys1 = Object.keys(ctx1);
    const keys2 = Object.keys(ctx2);
    
    const commonKeys = keys1.filter(k => keys2.includes(k));
    
    return commonKeys.length >= Math.min(keys1.length, keys2.length) * 0.5;
  }

  private findCommonContext(items: any[]): Record<string, any> {
    if (items.length === 0) return {};
    
    const common: Record<string, any> = {};
    const firstContext = items[0].context;
    
    for (const key of Object.keys(firstContext)) {
      const values = items.map(item => item.context[key]).filter(v => v !== undefined);
      
      if (values.length === items.length) {
        // All items have this key
        const uniqueValues = [...new Set(values)];
        if (uniqueValues.length === 1) {
          common[key] = uniqueValues[0];
        }
      }
    }
    
    return common;
  }
}

export const metaLearningService = new MetaLearningService();
export default metaLearningService;
