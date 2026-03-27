// Multi-Agent System Types - Phase 20

export enum AgentType {
  MONITORING = 'monitoring',
  OPTIMIZATION = 'optimization',
  RECOVERY = 'recovery',
  PLANNING = 'planning',
  USER_ASSISTANT = 'user_assistant',
  COORDINATOR = 'coordinator'
}

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AuthorityLevel {
  READ_ONLY = 'read_only',
  SUGGEST = 'suggest',
  EXECUTE_SAFE = 'execute_safe',
  EXECUTE_ALL = 'execute_all',
  ADMIN = 'admin'
}

// Agent Message for inter-agent communication
export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'proposal' | 'alert';
  priority: MessagePriority;
  payload: any;
  timestamp: Date;
  correlationId?: string; // For tracking request-response pairs
}

// Agent Proposal for distributed decision making
export interface AgentProposal {
  id: string;
  agentType: AgentType;
  action: string;
  reasoning: string;
  confidence: number; // 0-100
  priority: MessagePriority;
  expectedOutcome: string;
  risks: string[];
  requiredResources: string[];
  estimatedDuration: number; // milliseconds
  dependencies: string[]; // Other proposal IDs
  createdAt: Date;
}

// Agent Memory for learning and context
export interface AgentMemory {
  agentType: AgentType;
  decisions: Array<{
    id: string;
    action: string;
    context: any;
    outcome: 'success' | 'failure' | 'partial';
    timestamp: Date;
  }>;
  successRate: number;
  failurePatterns: Array<{
    pattern: string;
    count: number;
    lastOccurrence: Date;
  }>;
  contextAwareness: Record<string, any>;
  learnings: Array<{
    insight: string;
    confidence: number;
    timestamp: Date;
  }>;
}

// Base Agent Interface
export interface IAgent {
  type: AgentType;
  status: AgentStatus;
  authorityLevel: AuthorityLevel;
  memory: AgentMemory;
  
  // Core methods
  initialize(): Promise<void>;
  processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  proposeAction(context: any): Promise<AgentProposal | null>;
  executeAction(proposal: AgentProposal): Promise<any>;
  getStatus(): AgentStatus;
  getMemory(): AgentMemory;
  updateMemory(decision: any, outcome: any): Promise<void>;
}

// Monitoring Agent Inputs
export interface MonitoringInput {
  systemMetrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  applicationMetrics: {
    errorRate: number;
    latency: number;
    throughput: number;
    activeUsers: number;
  };
  workflowMetrics: {
    activeWorkflows: number;
    failedWorkflows: number;
    avgExecutionTime: number;
  };
}

// Optimization Agent Inputs
export interface OptimizationInput {
  performanceData: {
    slowQueries: Array<{ query: string; duration: number }>;
    bottlenecks: Array<{ component: string; severity: number }>;
    resourceUsage: Record<string, number>;
  };
  historicalData: {
    trends: Array<{ metric: string; trend: 'up' | 'down' | 'stable' }>;
    patterns: Array<{ pattern: string; frequency: number }>;
  };
}

// Recovery Agent Inputs
export interface RecoveryInput {
  failures: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    timestamp: Date;
    stackTrace?: string;
  }>;
  systemState: {
    healthy: boolean;
    degraded: boolean;
    critical: boolean;
  };
}

// Planning Agent Inputs
export interface PlanningInput {
  goal: string;
  constraints: {
    timeLimit?: number;
    resourceLimit?: number;
    dependencies?: string[];
  };
  context: {
    existingWorkflows: any[];
    availableResources: string[];
    userPreferences: Record<string, any>;
  };
}

// User Assistant Agent Inputs
export interface UserAssistantInput {
  userQuery: string;
  userId: string;
  sessionId?: string;
  context: {
    conversationHistory: any[];
    userPreferences: Record<string, any>;
    recentActions: string[];
  };
}

// Coordination Decision
export interface CoordinationDecision {
  selectedProposal: AgentProposal;
  rejectedProposals: AgentProposal[];
  reasoning: string;
  conflicts: Array<{
    proposal1: string;
    proposal2: string;
    conflictType: string;
    resolution: string;
  }>;
  executionPlan: {
    steps: Array<{
      agentType: AgentType;
      action: string;
      order: number;
    }>;
    estimatedDuration: number;
  };
}

// Shared State for agent coordination
export interface SharedState {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: MonitoringInput;
    lastUpdate: Date;
  };
  activeProposals: AgentProposal[];
  executingActions: Array<{
    proposalId: string;
    agentType: AgentType;
    startedAt: Date;
    progress: number;
  }>;
  recentDecisions: Array<{
    decision: CoordinationDecision;
    outcome: 'success' | 'failure' | 'pending';
    timestamp: Date;
  }>;
  agentStates: Record<AgentType, AgentStatus>;
}
