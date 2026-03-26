import { Workflow, SystemMetrics, Alert } from '@/lib/types/workflow.types';

export interface WorkflowResponse {
  workflow: Workflow;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
}

export interface MetricResponse {
  metrics: SystemMetrics;
}

export interface AlertResponse {
  alerts: Alert[];
}

export interface WorkflowStatusUpdateResponse {
  success: boolean;
  status: string;
  workflowId: string;
  updatedAt: string;
}
