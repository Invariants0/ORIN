import { create } from "zustand";

export type LogStatus = "loading" | "success" | "error";

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
  category: "today" | "previous";
}

interface CommandCenterState {
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  pipelines: Pipeline[];
  setPipelines: (pipelines: Pipeline[]) => void;

  executionLogs: ExecutionLogItem[];
  addLog: (log: ExecutionLogItem) => void;
  updateLog: (id: string, updates: Partial<ExecutionLogItem>) => void;
  updateStep: (logId: string, stepId: string, completed: boolean) => void;

  connectionStatus: "connecting" | "connected" | "disconnected";
  setConnectionStatus: (status: "connecting" | "connected" | "disconnected") => void;

  commandHistory: string[];
  addCommandToHistory: (cmd: string) => void;
}

export const useCommandCenterStore = create<CommandCenterState>((set) => ({
  currentSessionId: "session-1",
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  pipelines: [
    { id: "session-1", title: "Research Analysis: Q3 Trends", category: "today" },
    { id: "session-2", title: "Data Mapping: Notion Schema", category: "today" },
    { id: "session-3", title: "API Logs: Stripe Sync", category: "previous" },
    { id: "session-4", title: "Extract: Competitor Docs", category: "previous" },
  ],
  setPipelines: (pipelines) => set({ pipelines }),

  executionLogs: [
    {
      id: "log-1",
      command: "/store https://example.com/reports/q3-trends",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: "success",
      summary: "Extracted 32 structural points from document. Identified key sections: Executive Summary, Market Growth, Competitor Analysis, and Forward Projections.",
      steps: [
        { id: "s1", text: "Parsed HTML structure", completed: true },
        { id: "s2", text: "Extracted 4 primary tables", completed: true },
        { id: "s3", text: "Mapped to generic node schema", completed: true },
        { id: "s4", text: "Ready for database targeting", completed: true }
      ]
    },
    {
      id: "log-2",
      command: "/map --target workspace_db_id",
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      status: "loading",
      summary: "Structuring nodes for Notion block API... ",
      steps: [
        { id: "s1", text: "Validating schema against target DB", completed: true },
        { id: "s2", text: "Converting tables to inline databases", completed: false },
        { id: "s3", text: "Formatting rich text blocks", completed: false }
      ]
    }
  ],
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

  connectionStatus: "disconnected",
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  commandHistory: [],
  addCommandToHistory: (cmd) =>
    set((state) => ({ commandHistory: [cmd, ...state.commandHistory].slice(0, 50) })),
}));
