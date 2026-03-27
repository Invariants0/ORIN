import { SystemMetrics, Alert } from '@/lib/types/workflow.types';

export interface WorkflowStatistics {
  total: number;
  running: number;
  completed: number;
  failed: number;
  avgDuration: number;
  successRate: number;
}
