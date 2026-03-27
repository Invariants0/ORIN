import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MultiAgentApi } from '@/lib/api/endpoints/multi-agent.api';
import type { AgentStatus, MultiAgentSystemStats, InterAgentMessage, AgentQueryRequest } from '@/lib/api/types/multi-agent.api.types';
import { queryKeys } from './query-keys';
import { toast } from 'sonner';

/**
 * Fetch live statistics about the full swarm agent system
 */
export function useMultiAgentStats() {
  return useQuery<MultiAgentSystemStats>({
    queryKey: queryKeys.multiAgent.stats(),
    queryFn: () => MultiAgentApi.getStats(),
    refetchInterval: 3000, 
  } as any);
}

/**
 * Retrieve status list of all connected autonomous agents
 */
export function useAgentStatuses() {
  return useQuery<AgentStatus[]>({
    queryKey: queryKeys.multiAgent.statuses(),
    queryFn: () => MultiAgentApi.getStatuses(),
    refetchInterval: 3000,
  } as any);
}

/**
 * Fetch history of agent-to-agent negotiations and context passing
 */
export function useAgentMessages(limit: number = 100) {
  return useQuery<InterAgentMessage[]>({
    queryKey: queryKeys.multiAgent.messages(),
    queryFn: () => MultiAgentApi.getMessages(limit),
    refetchInterval: 5000,
  } as any);
}

/**
 * Imperatively send a query for the swarm to delegate and resolve
 */
export function useExecuteSwarmQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgentQueryRequest) => MultiAgentApi.query(payload),
    onSuccess: () => {
      // Swarm interactions likely change global statuses + messages
      queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.all });
    },
    onError: (err: any) => {
      toast.error(`Swarm Delegation Error: ${err.message}`);
    }
  });
}
