import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Workflow } from '@/lib/types/workflow.types';

// Query keys
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters?: any) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  statistics: () => [...workflowKeys.all, 'statistics'] as const,
};

// Queries
export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: workflowKeys.lists(),
    queryFn: api.getWorkflows,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => api.getWorkflowById(id),
    enabled: !!id,
  });
}

export function useWorkflowStatistics() {
  return useQuery({
    queryKey: workflowKeys.statistics(),
    queryFn: api.getWorkflowStatistics,
  });
}

// Mutations
export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.pauseWorkflow(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: workflowKeys.detail(id) });

      // Snapshot previous value
      const previousWorkflow = queryClient.getQueryData<Workflow>(
        workflowKeys.detail(id)
      );

      // Optimistically update
      if (previousWorkflow) {
        queryClient.setQueryData<Workflow>(workflowKeys.detail(id), {
          ...previousWorkflow,
          status: 'paused',
          _optimistic: true,
        } as any);
      }

      return { previousWorkflow };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousWorkflow) {
        queryClient.setQueryData(
          workflowKeys.detail(id),
          context.previousWorkflow
        );
      }
    },
    onSettled: (data, error, id) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.resumeWorkflow(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.detail(id) });

      const previousWorkflow = queryClient.getQueryData<Workflow>(
        workflowKeys.detail(id)
      );

      if (previousWorkflow) {
        queryClient.setQueryData<Workflow>(workflowKeys.detail(id), {
          ...previousWorkflow,
          status: 'running',
          _optimistic: true,
        } as any);
      }

      return { previousWorkflow };
    },
    onError: (err, id, context) => {
      if (context?.previousWorkflow) {
        queryClient.setQueryData(
          workflowKeys.detail(id),
          context.previousWorkflow
        );
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelWorkflow(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.detail(id) });

      const previousWorkflow = queryClient.getQueryData<Workflow>(
        workflowKeys.detail(id)
      );

      if (previousWorkflow) {
        queryClient.setQueryData<Workflow>(workflowKeys.detail(id), {
          ...previousWorkflow,
          status: 'cancelled',
          _optimistic: true,
        } as any);
      }

      return { previousWorkflow };
    },
    onError: (err, id, context) => {
      if (context?.previousWorkflow) {
        queryClient.setQueryData(
          workflowKeys.detail(id),
          context.previousWorkflow
        );
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}
