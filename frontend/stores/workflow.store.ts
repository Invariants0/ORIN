import { create } from 'zustand';
import { Workflow, WorkflowStep } from '@/lib/types/workflow.types';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearWorkflows: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,

  setWorkflows: (workflows) => set({ workflows }),

  addWorkflow: (workflow) =>
    set((state) => ({
      workflows: [workflow, ...state.workflows],
    })),

  updateWorkflow: (id, updates) =>
    set((state) => {
      const workflows = state.workflows.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
      );
      
      const currentWorkflow =
        state.currentWorkflow?.id === id
          ? { ...state.currentWorkflow, ...updates, updatedAt: new Date() }
          : state.currentWorkflow;

      return { workflows, currentWorkflow };
    }),

  removeWorkflow: (id) =>
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
      currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow,
    })),

  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  updateStep: (workflowId, stepId, updates) =>
    set((state) => {
      const workflows = state.workflows.map((w) => {
        if (w.id === workflowId) {
          const steps = w.steps.map((s) =>
            s.id === stepId ? { ...s, ...updates } : s
          );
          return { ...w, steps, updatedAt: new Date() };
        }
        return w;
      });

      const currentWorkflow =
        state.currentWorkflow?.id === workflowId
          ? {
              ...state.currentWorkflow,
              steps: state.currentWorkflow.steps.map((s) =>
                s.id === stepId ? { ...s, ...updates } : s
              ),
              updatedAt: new Date(),
            }
          : state.currentWorkflow;

      return { workflows, currentWorkflow };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearWorkflows: () => set({ workflows: [], currentWorkflow: null }),
}));
