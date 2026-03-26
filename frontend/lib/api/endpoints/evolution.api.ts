import client from '../client';
import {
  ObjectiveFunction,
  AgentOptimizationMetrics,
  OptimizationRun,
  PatternInsight
} from '../types/evolution.api.types';

export const EvolutionApi = {
  /**
   * Initialize evolution system
   */
  initialize: (): Promise<{ initialized: boolean }> =>
    client.post('/evolution/initialize').then(res => res.data),

  /**
   * Get evolution status
   */
  getStatus: () =>
    client.get('/evolution/status').then(res => res.data.data || res.data),

  /**
   * Run optimization cycle
   */
  optimize: (objectives: ObjectiveFunction[]): Promise<OptimizationRun> =>
    client.post('/evolution/optimize', { objectives }).then(res => res.data.data || res.data),

  /**
   * Get agent performance metrics
   */
  getAgentPerformance: (agentType: string): Promise<AgentOptimizationMetrics> =>
    client.get(`/evolution/agents/${agentType}/performance`).then(res => res.data.data || res.data),

  /**
   * Get macro evolution insights
   */
  getInsights: (): Promise<PatternInsight[]> =>
    client.get('/evolution/meta/insights').then(res => res.data.data || res.data),
};
