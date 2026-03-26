import { useQuery } from '@tanstack/react-query';
import { WorkflowApi } from '@/lib/api/endpoints/workflow.api';
import { queryKeys } from './query-keys';
import { Workflow, WorkflowStatus } from '@/lib/types/workflow.types';
import { useMemo } from 'react';

/**
 * Fetch all active and historical workflows.
 */
export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: queryKeys.workflows.lists(),
    queryFn: () => WorkflowApi.getWorkflows(),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch a single workflow by its ID.
 */
export function useWorkflow(id: string) {
  return useQuery<Workflow>({
    queryKey: queryKeys.workflows.detail(id),
    queryFn: () => WorkflowApi.getWorkflowById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ── Derived "Selector" Hooks ──────────────────────────────────────────

/**
 * Filter the workflows list by status.
 */
export function useWorkflowsByStatus(status: WorkflowStatus) {
  const { data: workflows = [] } = useWorkflows();
  return useMemo(
    () => workflows.filter((w) => w.status === status),
    [workflows, status]
  );
}

/**
 * Get total workflow counts.
 */
export function useWorkflowStats() {
  const { data: workflows = [] } = useWorkflows();
  return useMemo(() => ({
    total: workflows.length,
    active: workflows.filter(w => w.status === 'running').length,
    completed: workflows.filter(w => w.status === 'completed').length,
    failed: workflows.filter(w => w.status === 'failed').length,
  }), [workflows]);
}
