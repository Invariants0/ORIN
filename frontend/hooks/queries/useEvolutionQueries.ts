import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvolutionApi } from '@/lib/api/endpoints/evolution.api';
import type { ObjectiveFunction, AgentOptimizationMetrics, OptimizationRun, PatternInsight } from '@/lib/api/types/evolution.api.types';
import { queryKeys } from './query-keys';
import { toast } from 'sonner';

/**
 * Hook to get evolution system status.
 */
export function useEvolutionStatus() {
  return useQuery({
    queryKey: queryKeys.evolution.status(),
    queryFn: () => EvolutionApi.getStatus(),
    refetchInterval: 5000, // Poll every 5s for live status map updating
  } as any);
}

/**
 * Hook to execute an optimization cycle.
 */
export function useOptimizeSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (objectives: ObjectiveFunction[]) => EvolutionApi.optimize(objectives),
    onSuccess: () => {
      toast.success('Optimization cycle started');
      queryClient.invalidateQueries({ queryKey: queryKeys.evolution.status() });
      queryClient.invalidateQueries({ queryKey: queryKeys.evolution.insights() });
    },
    onError: (err: any) => {
      toast.error(`Optimization failed: ${err.message}`);
    }
  });
}

/**
 * Fetch macro evolution insights and patterns found over time.
 */
export function useEvolutionInsights() {
  return useQuery<PatternInsight[]>({
    queryKey: queryKeys.evolution.insights(),
    queryFn: () => EvolutionApi.getInsights(),
    staleTime: 60 * 1000, 
  } as any);
}

/**
 * See detailed performance metrics for a particular agent model type over time.
 */
export function useAgentPerformance(agentType: string) {
  return useQuery<AgentOptimizationMetrics>({
    queryKey: queryKeys.evolution.performance(agentType),
    queryFn: () => EvolutionApi.getAgentPerformance(agentType),
    enabled: !!agentType,
    staleTime: 10 * 1000,
  } as any);
}
