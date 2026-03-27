import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { WorkflowApi } from '@/lib/api/endpoints/workflow.api';
import { Workflow } from '@/lib/types/workflow.types';
import { queryKeys } from '../queries/query-keys';
import { toast } from 'sonner';

/**
 * Handle workflow status mutations (pause, resume, cancel).
 * Includes optimistic updates and error rollback.
 */
/**
 * Internal helper for optimistic status updates.
 */
async function handleOptimisticUpdate(queryClient: QueryClient, id: string, newStatus: Workflow['status'], label: string) {
  await queryClient.cancelQueries({ queryKey: queryKeys.workflows.detail(id) });
  const previous = queryClient.getQueryData<Workflow>(queryKeys.workflows.detail(id));
  if (previous) {
    queryClient.setQueryData<Workflow>(queryKeys.workflows.detail(id), {
      ...previous,
      status: newStatus,
      updatedAt: new Date(),
    });
  }
  return { previous, label };
}

/**
 * Handle workflow status mutations (pause, resume, cancel).
 */
export function usePauseWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => WorkflowApi.pause(id),
    onMutate: (id) => handleOptimisticUpdate(queryClient, id, 'paused', 'pause'),
    onError: (error, id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.workflows.detail(id), context.previous);
      toast.error(`Failed to pause: ${error.message}`);
    },
    onSuccess: () => toast.success('Workflow successfully paused'),
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
    },
  });
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => WorkflowApi.resume(id),
    onMutate: (id) => handleOptimisticUpdate(queryClient, id, 'running', 'resume'),
    onError: (error, id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.workflows.detail(id), context.previous);
      toast.error(`Failed to resume: ${error.message}`);
    },
    onSuccess: () => toast.success('Workflow successfully resumed'),
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
    },
  });
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => WorkflowApi.cancel(id),
    onMutate: (id) => handleOptimisticUpdate(queryClient, id, 'cancelled', 'cancel'),
    onError: (error, id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.workflows.detail(id), context.previous);
      toast.error(`Failed to cancel: ${error.message}`);
    },
    onSuccess: () => toast.success('Workflow successfully cancelled'),
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
    },
  });
}

/**
 * Legacy consolidated hook (optional, keeping for compatibility if used elsewhere).
 */
export function useUpdateWorkflowStatus() {
  const pauseMutation = usePauseWorkflow();
  const resumeMutation = useResumeWorkflow();
  const cancelMutation = useCancelWorkflow();

  return {
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    cancel: cancelMutation.mutate,
    isLoading: pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending,
    pauseMutation,
    resumeMutation,
    cancelMutation
  };
}
