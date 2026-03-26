import { create } from 'zustand';

/**
 * WorkflowStore — UI ONLY STATE
 * 
 * Following "Frontend Best Practices", this store only manages transient client state.
 * All persistent "Server Data" (Workflow lists, details) is managed by TanStack Query.
 */
interface WorkflowStoreState {
  currentWorkflowId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkflowId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  currentWorkflowId: null,
  isLoading: false,
  error: null,

  setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error: error }),
}));
