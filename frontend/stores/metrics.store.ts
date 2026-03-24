import { create } from 'zustand';
import { SystemMetrics } from '@/lib/types/workflow.types';

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function normalizeMetrics(metrics: unknown): SystemMetrics {
  const raw = (metrics ?? {}) as Record<string, unknown>;
  const completedWorkflows = toNumber(raw.completedWorkflows, toNumber(raw.completedToday, 0));
  const failedWorkflows = toNumber(raw.failedWorkflows, toNumber(raw.failedToday, 0));
  const failureRate = toNumber(raw.failureRate, 0);
  const successRate = toNumber(raw.successRate, Math.max(0, 1 - failureRate));

  return {
    activeWorkflows: toNumber(raw.activeWorkflows, 0),
    completedWorkflows,
    failedWorkflows,
    queueSize: toNumber(raw.queueSize, toNumber(raw.queuedWorkflows, 0)),
    averageExecutionTime: toNumber(raw.averageExecutionTime, 0),
    successRate,
    failureRate,
    timestamp: toDate(raw.timestamp),
  };
}

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
      const normalizedMetrics = normalizeMetrics(metrics);
      const history = [...state.history, normalizedMetrics];
      
      // Keep only last N entries
      if (history.length > state.maxHistorySize) {
        history.shift();
      }

      return { metrics: normalizedMetrics, history };
    }),

  clearHistory: () => set({ history: [] }),
}));
