import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AutonomyApi } from '@/lib/api/endpoints/autonomy.api';
import type { ExecuteActionRequest, AutonomousAction } from '@/lib/api/types/autonomy.api.types';
import { queryKeys } from './query-keys';
import { useAutonomyStore } from '@/stores/autonomy.store';
import { toast } from 'sonner';

/**
 * Phase 3 — Fetches real autonomous actions from the backend.
 * Syncs into Zustand store for optimistic update access.
 */
export function useAutonomyActions() {
  const setActions = useAutonomyStore((s) => s.setActions);

  return useQuery<AutonomousAction[]>({
    queryKey: queryKeys.autonomy.actions(),
    queryFn: () => AutonomyApi.getActions(),
    onSuccess: (data: AutonomousAction[]) => {
      // Sync server data into store so optimistic updates can reference it
      setActions(data);
    },
    staleTime: 30 * 1000,
  } as any); // TanStack v5 uses separate callbacks — kept compatible
}

/**
 * Phase 3 — Approve or reject an autonomous action.
 * Applies optimistic update in Zustand and invalidates server cache on settle.
 */
export function useExecuteAutonomyAction() {
  const queryClient = useQueryClient();
  const updateAction = useAutonomyStore((s) => s.updateAction);

  return useMutation({
    mutationFn: (payload: ExecuteActionRequest) => AutonomyApi.executeAction(payload),

    onMutate: ({ actionId, decision }) => {
      // Capture current status so we can roll back on failure
      const previousStatus = useAutonomyStore.getState().actions.find((a) => a.id === actionId)?.status ?? 'pending';
      // Optimistically reflect user intent
      updateAction(actionId, decision === 'reject' ? 'rejected' : 'approved');
      return { previousStatus };
    },

    onSuccess: (data, { actionId }) => {
      toast.success('Action executed successfully');
      // Sync true server status
      updateAction(actionId, data.status);
    },

    onError: (err: any, { actionId }, context) => {
      toast.error(`Action failed: ${err.message}`);
      // Rollback to captured previous status
      updateAction(actionId, context?.previousStatus ?? 'pending');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autonomy.actions() });
    },
  });
}

/**
 * Fetch macro autonomy behavior insights
 */
export function useAutonomyInsights() {
  return useQuery({
    queryKey: queryKeys.autonomy.insights(),
    queryFn: () => AutonomyApi.getInsights(),
    staleTime: 60 * 1000,
  } as any);
}

/**
 * Fetch currently defined security and autonomy policies
 */
export function useAutonomyPolicies() {
  return useQuery({
    queryKey: queryKeys.autonomy.policies(),
    queryFn: () => AutonomyApi.getPolicies(),
    staleTime: 10 * 1000,
  } as any);
}

/**
 * Mutation for dynamically toggling a security/access policy
 */
export function useTogglePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => AutonomyApi.togglePolicy(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autonomy.policies() });
    },
    onError: (err: any) => {
      toast.error(`Policy update failed: ${err.message}`);
    }
  });
}

/**
 * Killswitch: Instantly drops all autonomy capabilities back to manual/safe mode
 */
export function useEmergencyStop() {
  return useMutation({
    mutationFn: (userId: string) => AutonomyApi.emergencyStop(userId),
    onSuccess: () => {
      toast.success('Emergency Stop Engaged. All systems manual.');
    },
    onError: (err: any) => {
      toast.error(`Failed to execute emergency stop: ${err.message}`);
    }
  });
}
