import { useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkflowApi } from '@/lib/api/endpoints/workflow.api';
import { Workflow } from '@/lib/types/workflow.types';
import { queryKeys } from '../queries/query-keys';
import { toast } from 'sonner';

/**
 * Handle workflow status mutations (pause, resume, cancel).
 * Includes optimistic updates and error rollback.
 */
export function useUpdateWorkflowStatus() {
  const queryClient = useQueryClient();

  const handleOptimisticUpdate = async (id: string, newStatus: Workflow['status'], label: string) => {
    // 1. Cancel outgoing fetches for the specific detail query
    await queryClient.cancelQueries({ queryKey: queryKeys.workflows.detail(id) });

    // 2. Snapshot the current cache value
    const previous = queryClient.getQueryData<Workflow>(queryKeys.workflows.detail(id));

    // 3. Optimistically update local cache
    if (previous) {
      queryClient.setQueryData<Workflow>(queryKeys.workflows.detail(id), {
        ...previous,
        status: newStatus,
        updatedAt: new Date(),
      });
    }

    return { previous, label };
  };

  const handleError = (error: any, id: string, context: any) => {
    if (context?.previous) {
      queryClient.setQueryData(queryKeys.workflows.detail(id), context.previous);
    }
    toast.error(`Failed to ${context?.label}: ${error.message}`);
  };

  const handleSuccess = (data: any, id: string, context: any) => {
    toast.success(`Workflow successfully ${context?.label}ed`);
  };

  const handleSettled = (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
  };

  const pauseMutation = useMutation({
    mutationFn: (id: string) => WorkflowApi.pause(id),
    onMutate: (id) => handleOptimisticUpdate(id, 'paused', 'pause'),
    onError: handleError,
    onSuccess: handleSuccess,
    onSettled: (_, __, id) => handleSettled(id),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => WorkflowApi.resume(id),
    onMutate: (id) => handleOptimisticUpdate(id, 'running', 'resume'),
    onError: handleError,
    onSuccess: handleSuccess,
    onSettled: (_, __, id) => handleSettled(id),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => WorkflowApi.cancel(id),
    onMutate: (id) => handleOptimisticUpdate(id, 'cancelled', 'cancel'),
    onError: handleError,
    onSuccess: handleSuccess,
    onSettled: (_, __, id) => handleSettled(id),
  });

  return {
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    cancel: cancelMutation.mutate,
    isLoading: pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending,
  };
}
