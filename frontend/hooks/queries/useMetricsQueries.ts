import { useQuery } from '@tanstack/react-query';
import { MetricsApi } from '@/lib/api/endpoints/metrics.api';
import { queryKeys } from './query-keys';

/**
 * Fetch core system performance metrics.
 * Configured with active polling for real-time visual updates.
 */
export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.workflows.metrics(),
    queryFn: () => MetricsApi.getMetrics(),
    refetchInterval: 5000, 
    staleTime: 2000,
  });
}

/**
 * Fetch high-level workflow statistics (totals, averages).
 */
export function useWorkflowStatistics() {
  return useQuery({
    queryKey: queryKeys.workflows.statistics(),
    queryFn: () => MetricsApi.getStatistics(),
    staleTime: 10 * 1000,
  });
}
