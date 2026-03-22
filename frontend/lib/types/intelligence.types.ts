// Intelligence and self-awareness types for Phase 18

export interface OptimisticMetadata {
  type: 'pause' | 'resume' | 'cancel' | 'retry' | 'update';
  timestamp: number;
  operationId: string;
  userId?: string;
  expiresAt: number;
}

export interface QueuedEvent {
  event: any;
  version: number;
  timestamp: number;
  retryCount: number;
  workflowId: string;
}

export interface WorkflowPattern {
  workflowId: string;
  detectedAt: Date;
  patterns: {
    frequentPauses: boolean;
    highFailureRate: boolean;
    longRunningSteps: string[];
    resourceBottlenecks: boolean;
    repeatedErrors: string[];
  };
  statistics: {
    totalRuns: number;
    failureRate: number;
    averageDuration: number;
    pauseCount: number;
  };
}

export interface Prediction {
  workflowId: string;
  likelyToFail: number; // 0-1 probability
  estimatedDuration: number; // milliseconds
  confidence: number; // 0-1
  reasoning: string[];
}

export interface Suggestion {
  id: string;
  type: 'action' | 'optimization' | 'warning' | 'automation';
  message: string;
  confidence: number; // 0-1
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
  priority: number; // 1-5
}

export interface SmartAlert {
  id: string;
  workflowId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  groupId?: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  escalationLevel: number; // 0-3
  relatedAlerts: string[];
  suggestedActions: string[];
  acknowledged: boolean;
  autoAcknowledged?: boolean;
}

export interface TimelineEvent {
  id: string;
  type: string;
  workflowId: string;
  stepId?: string;
  timestamp: Date;
  version: number;
  data: any;
  source: 'websocket' | 'api' | 'user' | 'system';
  metadata: {
    userId?: string;
    duration?: number;
    previousState?: any;
    newState?: any;
  };
}

export interface HealthCheck {
  timestamp: Date;
  isHealthy: boolean;
  issues: {
    staleWorkflows: string[];
    missingUpdates: string[];
    inconsistentStates: string[];
    orphanedOptimistic: string[];
    versionConflicts: string[];
  };
  metrics: {
    totalWorkflows: number;
    healthyWorkflows: number;
    issueCount: number;
  };
}

export interface PerformanceMetrics {
  timestamp: Date;
  componentRenders: Record<string, number>;
  renderDuration: Record<string, number[]>;
  heavyComponents: string[];
  throttledUpdates: number;
  droppedFrames: number;
  memoryUsage?: number;
}

export interface UserAction {
  id: string;
  type: string;
  workflowId?: string;
  timestamp: Date;
  context: any;
  duration?: number;
}

export interface UserBehavior {
  userId?: string;
  actions: UserAction[];
  patterns: {
    frequentWorkflows: string[];
    commonActions: string[];
    timeOfDayPatterns: Record<string, number>;
    errorRecoveryPatterns: string[];
  };
  preferences: {
    autoRetry: boolean;
    notificationLevel: 'all' | 'important' | 'critical';
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface ReconciliationResult {
  workflowId: string;
  timestamp: Date;
  hadConflict: boolean;
  resolution: 'server_wins' | 'client_wins' | 'merged';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface VersionState {
  workflowId: string;
  lastProcessedVersion: number;
  pendingVersions: number[];
  hasGaps: boolean;
}
