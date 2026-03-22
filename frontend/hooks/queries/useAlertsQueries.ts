import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

// Query keys
export const alertsKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertsKeys.all, 'list'] as const,
};

// Queries
export function useAlerts() {
  return useQuery({
    queryKey: alertsKeys.lists(),
    queryFn: api.getAlerts,
  });
}

// Mutations
export function useClearAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.clearAlerts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
    },
  });
}
