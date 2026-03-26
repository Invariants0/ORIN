import { create } from 'zustand';

export type LogStatus = 'loading' | 'success' | 'error';

export interface Step {
  id: string;
  text: string;
  completed: boolean;
}

export interface ExecutionLogItem {
  id: string;
  command: string;
  timestamp: Date;
  status: LogStatus;
  summary?: string;
  steps: Step[];
}

export interface Pipeline {
  id: string;
  title: string;
  category: 'today' | 'previous';
}

interface CommandCenterState {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  pipelines: Pipeline[];
  setPipelines: (pipelines: Pipeline[]) => void;

  executionLogs: ExecutionLogItem[];
  setExecutionLogs: (logs: ExecutionLogItem[]) => void;
  addLog: (log: ExecutionLogItem) => void;
  updateLog: (id: string, updates: Partial<ExecutionLogItem>) => void;
  updateStep: (logId: string, stepId: string, completed: boolean) => void;
  clearLogs: () => void;

  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;

  commandHistory: string[];
  addCommandToHistory: (cmd: string) => void;
}

export const useCommandCenterStore = create<CommandCenterState>((set) => ({
  // ── Session ────────────────────────────────────────────────────────────
  currentSessionId: null, // set from API after load
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  // ── Pipelines ──────────────────────────────────────────────────────────
  pipelines: [], // populated from API
  setPipelines: (pipelines) => set({ pipelines }),

  // ── Execution Logs ─────────────────────────────────────────────────────
  executionLogs: [], // populated from real command execution
  setExecutionLogs: (logs) => set({ executionLogs: logs }),
  addLog: (log) => set((state) => ({ executionLogs: [...state.executionLogs, log] })),
  updateLog: (id, updates) =>
    set((state) => ({
      executionLogs: state.executionLogs.map((log) =>
        log.id === id ? { ...log, ...updates } : log
      ),
    })),
  updateStep: (logId, stepId, completed) =>
    set((state) => ({
      executionLogs: state.executionLogs.map((log) =>
        log.id === logId
          ? {
              ...log,
              steps: log.steps.map((step) =>
                step.id === stepId ? { ...step, completed } : step
              ),
            }
          : log
      ),
    })),
  clearLogs: () => set({ executionLogs: [] }),

  // ── WebSocket ──────────────────────────────────────────────────────────
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ── History ────────────────────────────────────────────────────────────
  commandHistory: [],
  addCommandToHistory: (cmd) =>
    set((state) => ({ commandHistory: [cmd, ...state.commandHistory].slice(0, 50) })),
}));
