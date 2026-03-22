// Autonomy Types for Phase 19

export enum AutonomyLevel {
  MANUAL = 'manual',
  ASSISTED = 'assisted',
  SEMI_AUTO = 'semi_auto',
  AUTO = 'auto'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ActionType {
  RETRY_WORKFLOW = 'retry_workflow',
  PAUSE_WORKFLOW = 'pause_workflow',
  RESUME_WORKFLOW = 'resume_workflow',
  CANCEL_WORKFLOW = 'cancel_workflow',
  SCALE_RESOURCES = 'scale_resources',
  OPTIMIZE_PARAMETERS = 'optimize_parameters',
  ALERT_USER = 'alert_user'
}

export enum ActionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  FAILED = 'failed',
  UNDONE = 'undone'
}

export interface DecisionInput {
  predictions: any[];
  systemHealth: {
    cpu: number;
    memory: number;
    errorRate: number;
    latency: number;
  };
  userBehavior: {
    recentActions: string[];
    preferences: Record<string, any>;
    interventionRate: number;
  };
  context: {
    workflowId?: string;
    sessionId?: string;
    timestamp: Date;
  };
}

export interface Decision {
  id: string;
  action: ActionType;
  confidence: number; // 0-100
  riskLevel: RiskLevel;
  reasoning: string;
  dataUsed: string[];
  expectedOutcome: string;
  rollbackPlan: string;
  requiresApproval: boolean;
  createdAt: Date;
}

export interface ActionExecution {
  id: string;
  decisionId: string;
  status: ActionStatus;
  executedAt?: Date;
  result?: any;
  error?: string;
  undoneAt?: Date;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  condition: (input: DecisionInput) => boolean;
  action: ActionType;
  priority: number;
  enabled: boolean;
}

export interface LearningData {
  decisionId: string;
  userApproved: boolean;
  actionSucceeded: boolean;
  userIntervened: boolean;
  performanceImpact: number;
  timestamp: Date;
}

export interface AutonomyConfig {
  userId: string;
  level: AutonomyLevel;
  confidenceThreshold: number;
  allowedActions: ActionType[];
  blockedActions: ActionType[];
  maxRetries: number;
  pauseThreshold: number;
}
