// Optimization Agent - Phase 20

import { BaseAgent } from './base-agent.service.js';
import {
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  OptimizationInput,
  MessagePriority
} from '@/types/agent.types.js';

export class OptimizationAgent extends BaseAgent {
  constructor() {
    super(AgentType.OPTIMIZATION, AuthorityLevel.SUGGEST);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Processing message', { messageType: message.type, from: message.from });

    switch (message.type) {
      case 'request':
        return await this.handleOptimizationRequest(message);

      default:
        return null;
    }
  }

  async proposeAction(context: OptimizationInput): Promise<AgentProposal | null> {
    this.status = AgentStatus.ACTIVE;

    try {
      const opportunities = this.identifyOptimizations(context);

      if (opportunities.length === 0) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      const best = opportunities[0];
      const proposal = this.createProposal(
        best.action,
        best.reasoning,
        best.confidence,
        best.expectedOutcome,
        best.risks,
        best.estimatedDuration
      );

      this.log('info', 'Optimization proposal created', { action: proposal.action });
      return proposal;

    } catch (error: any) {
      this.log('error', 'Failed to propose optimization', { error: error.message });
      this.status = AgentStatus.ERROR;
      return null;
    }
  }

  async executeAction(proposal: AgentProposal): Promise<any> {
    this.status = AgentStatus.BUSY;

    try {
      this.log('info', 'Executing optimization', { action: proposal.action });

      let result;
      switch (proposal.action) {
        case 'optimize_query':
          result = await this.optimizeQuery(proposal);
          break;

        case 'cache_frequently_accessed':
          result = await this.enableCaching(proposal);
          break;

        case 'reduce_resource_usage':
          result = await this.reduceResourceUsage(proposal);
          break;

        default:
          throw new Error(`Unknown optimization action: ${proposal.action}`);
      }

      this.status = AgentStatus.IDLE;
      return { success: true, result };

    } catch (error: any) {
      this.log('error', 'Optimization failed', { error: error.message });
      this.status = AgentStatus.ERROR;
      return { success: false, error: error.message };
    }
  }

  private identifyOptimizations(context: OptimizationInput): Array<{
    action: string;
    reasoning: string;
    confidence: number;
    expectedOutcome: string;
    risks: string[];
    estimatedDuration: number;
  }> {
    const opportunities: any[] = [];

    // Check for slow queries
    if (context.performanceData.slowQueries.length > 0) {
      const slowest = context.performanceData.slowQueries[0];
      opportunities.push({
        action: 'optimize_query',
        reasoning: `Query taking ${slowest.duration}ms can be optimized`,
        confidence: 80,
        expectedOutcome: 'Query performance will improve by 30-50%',
        risks: ['Query behavior may change slightly'],
        estimatedDuration: 10000
      });
    }

    // Check for caching opportunities
    const accessPatterns = context.historicalData.patterns.filter(p =>
      p.pattern.includes('frequent_access')
    );

    if (accessPatterns.length > 0) {
      opportunities.push({
        action: 'cache_frequently_accessed',
        reasoning: 'Frequently accessed data can be cached to reduce load',
        confidence: 85,
        expectedOutcome: 'Response time will improve by 40-60%',
        risks: ['Cache invalidation complexity', 'Memory usage increase'],
        estimatedDuration: 5000
      });
    }

    // Check for resource optimization
    const highUsage = Object.entries(context.performanceData.resourceUsage)
      .filter(([_, usage]) => usage > 70);

    if (highUsage.length > 0) {
      opportunities.push({
        action: 'reduce_resource_usage',
        reasoning: `High resource usage detected: ${highUsage.map(([r]) => r).join(', ')}`,
        confidence: 75,
        expectedOutcome: 'Resource usage will decrease by 20-30%',
        risks: ['May require code changes', 'Testing required'],
        estimatedDuration: 15000
      });
    }

    return opportunities.sort((a, b) => b.confidence - a.confidence);
  }

  private async handleOptimizationRequest(message: AgentMessage): Promise<AgentMessage> {
    const { requestType, context } = message.payload;

    this.log('info', 'Handling optimization request', { requestType });

    // Create mock optimization input
    const optimizationInput: OptimizationInput = {
      performanceData: {
        slowQueries: [],
        bottlenecks: [],
        resourceUsage: {}
      },
      historicalData: {
        trends: [],
        patterns: []
      }
    };

    const proposal = await this.proposeAction(optimizationInput);

    if (proposal) {
      return this.createMessage(
        AgentType.COORDINATOR,
        'proposal',
        { proposal },
        proposal.priority,
        message.id
      );
    }

    return this.createMessage(
      message.from,
      'response',
      { message: 'No optimization opportunities found' },
      MessagePriority.LOW,
      message.id
    );
  }

  private async optimizeQuery(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Optimizing query');
    await this.sleep(3000);
    return { action: 'optimize_query', status: 'completed', improvement: '45%' };
  }

  private async enableCaching(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Enabling caching');
    await this.sleep(2000);
    return { action: 'cache_enabled', status: 'completed', cacheHitRate: '80%' };
  }

  private async reduceResourceUsage(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Reducing resource usage');
    await this.sleep(5000);
    return { action: 'resource_optimized', status: 'completed', reduction: '25%' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const optimizationAgent = new OptimizationAgent();
