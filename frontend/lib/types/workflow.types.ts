export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface WorkflowStep {
  id: string;
  name: string;
  status: StepStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  logs?: string[];
  metadata?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  queueSize: number;
  averageExecutionTime: number;
  successRate: number;
  failureRate: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  workflowId?: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface WorkflowEvent {
  type: 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused' | 'workflow_resumed' | 'workflow_cancelled' | 'step_started' | 'step_completed' | 'step_failed';
  workflowId: string;
  stepId?: string;
  data?: any;
  timestamp: Date;
}
