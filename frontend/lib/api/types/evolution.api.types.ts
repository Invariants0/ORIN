export interface ObjectiveFunction {
  metric: string;
  target: number;
  weight: number;
}

export interface AgentOptimizationMetrics {
  successRate: number;
  latencyMs: number;
  costTokens: number;
}

export interface ArchitectureNode {
  type: string;
  name: string;
  connections: string[];
}

export interface OptimizationRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  improvementPercentage: number;
  parametersTuned: Record<string, any>;
  timestamp: string;
}

export interface PatternInsight {
  id: string;
  description: string;
  frequency: number;
  confidence: number;
}
