import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MetricsApi } from '@/lib/api/endpoints/metrics.api';
import { queryKeys } from './query-keys';
import { toast } from 'sonner';

/**
 * Fetch active system alerts.
 */
export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts.all,
    queryFn: () => MetricsApi.getAlerts(),
    refetchInterval: 15000,
  });
}

/**
 * Mutation hook to clear all active alerts.
 * Automatically invalidates relevant caches and notifies user via toast.
 */
export function useClearAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => MetricsApi.clearAlerts(),
    onSuccess: () => {
      toast.success('Alerts cleared successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
    onError: (err: any) => {
      toast.error(`Failed to clear alerts: ${err.message}`);
    },
  });
}
