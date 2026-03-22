import { useWorkflowStore } from '@/stores/workflow.store';
import { useMemo } from 'react';
import { Workflow, WorkflowStatus } from '@/lib/types/workflow.types';

// Optimized selectors to prevent unnecessary re-renders

export function useWorkflowById(id: string) {
  return useWorkflowStore((state) => state.workflowsById[id]);
}

export function useAllWorkflows() {
  return useWorkflowStore((state) => {
    const { workflowsById, workflowIds } = state;
    return workflowIds.map((id) => workflowsById[id]).filter(Boolean);
  });
}

export function useCurrentWorkflow() {
  return useWorkflowStore((state) => {
    const { currentWorkflowId, workflowsById } = state;
    return currentWorkflowId ? workflowsById[currentWorkflowId] || null : null;
  });
}

export function useWorkflowsByStatus(status: WorkflowStatus) {
  const workflows = useAllWorkflows();
  
  return useMemo(
    () => workflows.filter((w) => w.status === status),
    [workflows, status]
  );
}

export function useWorkflowCount() {
  return useWorkflowStore((state) => state.workflowIds.length);
}

export function useWorkflowLoading() {
  return useWorkflowStore((state) => state.isLoading);
}

export function useWorkflowError() {
  return useWorkflowStore((state) => state.error);
}
