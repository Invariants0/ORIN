import { create } from 'zustand';
import { Workflow, WorkflowStep } from '@/lib/types/workflow.types';

// Normalized state structure
interface WorkflowState {
  // Normalized data
  workflowsById: Record<string, Workflow>;
  workflowIds: string[];
  currentWorkflowId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Selectors
  getWorkflow: (id: string) => Workflow | undefined;
  getAllWorkflows: () => Workflow[];
  getCurrentWorkflow: () => Workflow | null;
  
  // Actions
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
  setCurrentWorkflowId: (id: string | null) => void;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearWorkflows: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Normalized state
  workflowsById: {},
  workflowIds: [],
  currentWorkflowId: null,
  
  // UI state
  isLoading: false,
  error: null,

  // Selectors
  getWorkflow: (id) => get().workflowsById[id],
  
  getAllWorkflows: () => {
    const { workflowsById, workflowIds } = get();
    return workflowIds.map((id) => workflowsById[id]).filter(Boolean);
  },
  
  getCurrentWorkflow: () => {
    const { currentWorkflowId, workflowsById } = get();
    return currentWorkflowId ? workflowsById[currentWorkflowId] || null : null;
  },

  // Actions
  setWorkflows: (workflows) =>
    set(() => {
      const workflowsById: Record<string, Workflow> = {};
      const workflowIds: string[] = [];

      workflows.forEach((workflow) => {
        workflowsById[workflow.id] = workflow;
        workflowIds.push(workflow.id);
      });

      return { workflowsById, workflowIds };
    }),

  addWorkflow: (workflow) =>
    set((state) => ({
      workflowsById: {
        [workflow.id]: workflow,
        ...state.workflowsById,
      },
      workflowIds: [workflow.id, ...state.workflowIds],
    })),

  updateWorkflow: (id, updates) =>
    set((state) => {
      const workflow = state.workflowsById[id];
      if (!workflow) return state;

      return {
        workflowsById: {
          ...state.workflowsById,
          [id]: {
            ...workflow,
            ...updates,
            updatedAt: new Date(),
          },
        },
      };
    }),

  removeWorkflow: (id) =>
    set((state) => {
      const { [id]: removed, ...workflowsById } = state.workflowsById;
      const workflowIds = state.workflowIds.filter((wId) => wId !== id);
      const currentWorkflowId = state.currentWorkflowId === id ? null : state.currentWorkflowId;

      return { workflowsById, workflowIds, currentWorkflowId };
    }),

  setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),

  updateStep: (workflowId, stepId, updates) =>
    set((state) => {
      const workflow = state.workflowsById[workflowId];
      if (!workflow) return state;

      const steps = workflow.steps.map((s) =>
        s.id === stepId ? { ...s, ...updates } : s
      );

      return {
        workflowsById: {
          ...state.workflowsById,
          [workflowId]: {
            ...workflow,
            steps,
            updatedAt: new Date(),
          },
        },
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearWorkflows: () =>
    set({
      workflowsById: {},
      workflowIds: [],
      currentWorkflowId: null,
    }),
}));
