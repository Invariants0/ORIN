import client from '../client';
import { SystemMetrics, Alert } from '@/lib/types/workflow.types';
import { WorkflowStatistics } from '../types/metrics.api.types';

export const MetricsApi = {
  /**
   * Fetch aggregate system-wide performance statistics.
   */
  getStatistics: (): Promise<WorkflowStatistics> =>
    client.get('/workflows/statistics').then(res => res.data.data || res.data),

  /**
   * Fetch time-series based system metrics.
   */
  getMetrics: (): Promise<SystemMetrics> =>
    client.get('/workflows/metrics').then(res => res.data.data || res.data),

  /**
   * Fetch all system alerts and notifications.
   */
  getAlerts: (): Promise<Alert[]> =>
    client.get('/workflows/alerts').then(res => res.data.data || res.data),
  
  /**
   * Clear all active system alerts.
   */
  clearAlerts: (): Promise<void> =>
    client.delete('/workflows/alerts').then(() => undefined)
};
