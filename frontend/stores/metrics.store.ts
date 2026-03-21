import { create } from 'zustand';
import { SystemMetrics } from '@/lib/types/workflow.types';

interface MetricsState {
  metrics: SystemMetrics | null;
  history: SystemMetrics[];
  maxHistorySize: number;
  
  // Actions
  updateMetrics: (metrics: SystemMetrics) => void;
  clearHistory: () => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: null,
  history: [],
  maxHistorySize: 50,

  updateMetrics: (metrics) =>
    set((state) => {
      const history = [...state.history, metrics];
      
      // Keep only last N entries
      if (history.length > state.maxHistorySize) {
        history.shift();
      }

      return { metrics, history };
    }),

  clearHistory: () => set({ history: [] }),
}));
