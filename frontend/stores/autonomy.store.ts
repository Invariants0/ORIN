import { create } from 'zustand';
import type { AutonomyLevel, AutonomousAction, ActionStatus } from '@/lib/api/types/autonomy.api.types';

// Re-export for consumers that import from the store
export type { AutonomyLevel, AutonomousAction, ActionStatus };

interface AutonomyState {
  /** Current autonomy level — UI-only state, no backend sync needed */
  level: AutonomyLevel;
  setLevel: (level: AutonomyLevel) => void;

  /**
   * Local cache of actions from the server.
   * NOTE: Populated by the useAutonomyActions React Query hook — NOT seeded here.
   * updateAction is used for optimistic updates while mutation is in-flight.
   */
  actions: AutonomousAction[];
  setActions: (actions: AutonomousAction[]) => void;
  updateAction: (id: string, status: ActionStatus) => void;
}

export const useAutonomyStore = create<AutonomyState>((set) => ({
  level: 'assisted',
  setLevel: (level) => set({ level }),

  actions: [], // populated by useAutonomyActions query hook
  setActions: (actions) => set({ actions }),
  updateAction: (id, status) =>
    set((state) => ({
      actions: state.actions.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
}));
