// Evolution System Types - Phase 21

import { AgentType, AgentStatus, AuthorityLevel, AgentProposal } from './agent.types.js';

// ==================== AGENT EVOLUTION ====================

export interface AgentEvolutionStrategy {
  strategyId: string;
  agentType: AgentType;
  name: string;
  description: string;
  parameters: Record<string, number>;
  successRate: number;
  usageCount: number;
  lastUsed: Date;
  enabled: boolean;
}

export interface AgentPerformanceMetrics {
  agentType: AgentType;
  totalProposals: number;
  acceptedProposals: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageConfidence: number;
  averageExecutionTime: number;
  successRate: number;
  acceptanceRate: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
  lastUpdated: Date;
}

export interface StrategyOptimization {
  agentType: AgentType;
  currentStrategy: AgentEvolutionStrategy;
  proposedStrategy: AgentEvolutionStrategy;
  expectedImprovement: number;
  confidence: number;
  reasoning: string;
  risks: string[];
}

export interface ThresholdTuning {
  agentType: AgentType;
  thresholds: {
    confidenceThreshold: number;
    riskTolerance: number;
    priorityWeight: number;
    timeoutMultiplier: number;
  };
  performanceImpact: {
    before: AgentPerformanceMetrics;
    after: AgentPerformanceMetrics;
    improvement: number;
  };
}

// ==================== DYNAMIC AGENT CREATION ====================

export interface DynamicAgentSpec {
  id: string;
  name: string;
  type: string; // e.g., 'recovery_specialist', 'database_retry_agent'
  baseAgentType: AgentType;
  specialization: string;
  authority: AuthorityLevel;
  capabilities: string[];
  triggers: AgentTrigger[];
  constraints: AgentConstraints;
  temporary: boolean;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: 'system' | 'user' | 'meta_learning';
  creationReason: string;
}

export interface AgentTrigger {
  type: 'pattern' | 'threshold' | 'event' | 'schedule';
  condition: string;
  parameters: Record<string, any>;
}

export interface AgentConstraints {
  maxExecutionsPerHour: number;
  maxResourceUsage: {
    memory: number; // MB
    cpu: number; // percentage
  };
  allowedActions: string[];
  requiredApprovals: string[];
}

export interface AgentTemplate {
  templateId: string;
  name: string;
  description: string;
  baseAgentType: AgentType;
  defaultAuthority: AuthorityLevel;
  configurableParameters: string[];
  useCases: string[];
  successRate: number;
  usageCount: number;
}

export interface AgentLifecycle {
  agentId: string;
  status: 'created' | 'active' | 'suspended' | 'deprecated' | 'removed';
  createdAt: Date;
  activatedAt?: Date;
  suspendedAt?: Date;
  removedAt?: Date;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  performanceScore: number;
  removalReason?: string;
}

// ==================== META-LEARNING ====================

export interface MetaLearningPattern {
  patternId: string;
  name: string;
  description: string;
  category: 'failure' | 'success' | 'optimization' | 'bottleneck';
  frequency: number;
  confidence: number;
  affectedAgents: AgentType[];
  detectedAt: Date;
  lastOccurrence: Date;
  examples: PatternExample[];
  suggestedAction: string;
}

export interface PatternExample {
  timestamp: Date;
  context: Record<string, any>;
  outcome: 'success' | 'failure';
  agentType: AgentType;
  proposalId: string;
}

export interface CrossAgentInsight {
  insightId: string;
  type: 'strategy' | 'coordination' | 'resource' | 'performance';
  title: string;
  description: string;
  affectedAgents: AgentType[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: InsightEvidence[];
  recommendations: string[];
  createdAt: Date;
}

export interface InsightEvidence {
  source: AgentType;
  metric: string;
  value: number;
  timestamp: Date;
  context: Record<string, any>;
}

export interface BestPractice {
  practiceId: string;
  name: string;
  description: string;
  category: string;
  applicableAgents: AgentType[];
  successRate: number;
  adoptionRate: number;
  discoveredAt: Date;
  validatedBy: string[];
  examples: string[];
}

export interface KnowledgeTransfer {
  transferId: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  knowledgeType: 'strategy' | 'pattern' | 'threshold' | 'best_practice';
  content: Record<string, any>;
  effectiveness: number;
  transferredAt: Date;
}

// ==================== ARCHITECTURE OPTIMIZATION ====================

export interface ArchitectureEvaluation {
  evaluationId: string;
  timestamp: Date;
  overallScore: number;
  agentEvaluations: AgentEvaluation[];
  bottlenecks: Bottleneck[];
  recommendations: ArchitectureRecommendation[];
  systemHealth: {
    coordination: number;
    performance: number;
    reliability: number;
    efficiency: number;
  };
}

export interface AgentEvaluation {
  agentType: AgentType;
  performanceScore: number;
  utilizationRate: number;
  successRate: number;
  responseTime: number;
  resourceEfficiency: number;
  collaborationScore: number;
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  strengths: string[];
  weaknesses: string[];
}

export interface Bottleneck {
  bottleneckId: string;
  type: 'coordination' | 'resource' | 'decision' | 'execution';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedAgents: AgentType[];
  impact: {
    latency: number;
    throughput: number;
    errorRate: number;
  };
  suggestedFix: string;
}

export interface ArchitectureRecommendation {
  recommendationId: string;
  type: 'promote' | 'demote' | 'rebalance' | 'create' | 'remove';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  targetAgent?: AgentType;
  expectedImpact: {
    performance: number;
    reliability: number;
    efficiency: number;
  };
  risks: string[];
  requiresApproval: boolean;
}

export interface ResponsibilityRebalance {
  rebalanceId: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  responsibilities: string[];
  reason: string;
  expectedImprovement: number;
  implementedAt?: Date;
  outcome?: {
    success: boolean;
    actualImprovement: number;
    issues: string[];
  };
}

// ==================== SAFETY & CONTROL ====================

export interface SafetyConstraints {
  maxAgentsPerType: number;
  maxTotalAgents: number;
  maxTemporaryAgents: number;
  creationRateLimit: {
    count: number;
    period: number; // milliseconds
  };
  resourceLimits: {
    memoryPerAgent: number; // MB
    cpuPerAgent: number; // percentage
    totalMemory: number; // MB
    totalCpu: number; // percentage
  };
  authorityConstraints: {
    newAgentAuthority: AuthorityLevel;
    promotionRequiresApproval: boolean;
    criticalActionsRequireOversight: boolean;
    autoDemoteOnFailures: number;
  };
}

export interface EvolutionCheckpoint {
  checkpointId: string;
  timestamp: Date;
  systemState: {
    agents: DynamicAgentSpec[];
    strategies: AgentEvolutionStrategy[];
    metrics: AgentPerformanceMetrics[];
    architecture: ArchitectureEvaluation;
  };
  reason: string;
  createdBy: 'system' | 'user';
}

export interface EvolutionAction {
  actionId: string;
  type: 'create_agent' | 'remove_agent' | 'optimize_strategy' | 'rebalance' | 'promote' | 'demote';
  target: string;
  parameters: Record<string, any>;
  requestedBy: 'system' | 'user' | 'agent';
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'rolled_back';
  approvedBy?: string;
  approvedAt?: Date;
  executedAt?: Date;
  outcome?: {
    success: boolean;
    impact: Record<string, number>;
    issues: string[];
  };
}

export interface SafetyViolation {
  violationId: string;
  type: 'resource_limit' | 'creation_limit' | 'authority_breach' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  violator: string;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  action: string;
}

export interface EvolutionAuditEntry {
  entryId: string;
  timestamp: Date;
  action: EvolutionAction;
  performedBy: string;
  result: 'success' | 'failure' | 'partial';
  changes: Record<string, any>;
  impact: {
    performance: number;
    reliability: number;
    efficiency: number;
  };
  rollbackAvailable: boolean;
}

// ==================== SELF-OPTIMIZATION ====================

export interface OptimizationTarget {
  targetId: string;
  name: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
}

export interface OptimizationCycle {
  cycleId: string;
  startedAt: Date;
  completedAt?: Date;
  targets: OptimizationTarget[];
  actions: EvolutionAction[];
  results: {
    achieved: OptimizationTarget[];
    failed: OptimizationTarget[];
    improvements: Record<string, number>;
  };
  nextCycleAt?: Date;
}

export interface PerformanceBaseline {
  baselineId: string;
  timestamp: Date;
  metrics: {
    coordinationLatency: number;
    decisionAccuracy: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
    throughput: number;
    errorRate: number;
  };
}

export interface OptimizationStrategy {
  strategyId: string;
  name: string;
  description: string;
  targetMetric: string;
  approach: 'incremental' | 'aggressive' | 'conservative';
  steps: OptimizationStep[];
  expectedImprovement: number;
  risks: string[];
}

export interface OptimizationStep {
  stepId: string;
  order: number;
  action: string;
  parameters: Record<string, any>;
  expectedImpact: number;
  rollbackable: boolean;
}

// ==================== EVOLUTION ORCHESTRATOR ====================

export interface EvolutionStatus {
  enabled: boolean;
  mode: 'learning' | 'optimizing' | 'evolving' | 'paused';
  currentCycle?: OptimizationCycle;
  totalAgents: number;
  dynamicAgents: number;
  temporaryAgents: number;
  activeOptimizations: number;
  pendingActions: number;
  safetyStatus: 'healthy' | 'warning' | 'critical';
  lastCheckpoint: Date;
  systemHealth: {
    overall: number;
    evolution: number;
    safety: number;
    performance: number;
  };
}

export interface EvolutionConfig {
  enabled: boolean;
  autoOptimize: boolean;
  optimizationInterval: number; // milliseconds
  safetyConstraints: SafetyConstraints;
  requireHumanApproval: boolean;
  approvalThreshold: {
    agentCreation: boolean;
    strategyChange: boolean;
    architectureChange: boolean;
    authorityChange: boolean;
  };
  checkpointInterval: number; // milliseconds
  maxCheckpoints: number;
}

export interface EvolutionMetrics {
  totalEvolutions: number;
  successfulEvolutions: number;
  failedEvolutions: number;
  rolledBackEvolutions: number;
  agentsCreated: number;
  agentsRemoved: number;
  strategiesOptimized: number;
  performanceImprovement: number;
  resourceEfficiencyGain: number;
  averageOptimizationTime: number;
}
