import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

// Query keys
export const metricsKeys = {
  all: ['metrics'] as const,
  current: () => [...metricsKeys.all, 'current'] as const,
};

// Queries
export function useMetrics() {
  return useQuery({
    queryKey: metricsKeys.current(),
    queryFn: api.getWorkflowMetrics,
    refetchInterval: 5000, // Refetch every 5 seconds for metrics
  });
}
