import { create } from 'zustand';

export type Role = 'user' | 'assistant';

export interface CommandStep {
  label: string;
  status: 'pending' | 'running' | 'done';
}

export interface OrinMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  references?: string[];
  // For slash-command rendering
  command?: string;       // e.g. "/store"
  commandArgs?: string;   // everything after the command
  commandSteps?: CommandStep[];
  isStreaming?: boolean;  // true while steps still animating
}

export interface OrinSession {
  id: string;
  title: string;
  createdAt: number;
}

export type Mode = 'explore' | 'build' | 'capture';

export interface OrinUser {
  id: string;
  email: string;
  name: string;
}

export interface OrinConnections {
  notion: boolean;
  email: boolean;
  slack: boolean;
}

const DEMO: Record<string, OrinMessage[]> = {
  '1': [
    {
      id: '1-a', role: 'assistant',
      content: "Welcome back! Your Notion workspace has 3 new documents since your last visit.",
      timestamp: Date.now() - 7200000,
    },
    {
      id: '1-b', role: 'user',
      content: "What's the latest on the multi-agent architecture?",
      timestamp: Date.now() - 3600000,
    },
    {
      id: '1-c', role: 'assistant',
      content: "Your Notion database has 3 documents about multi-agent systems. Key finding: the orchestrator pattern you documented aligns with the meta-orchestrator design.",
      timestamp: Date.now() - 3540000,
      references: ['Multi_Agent_Docs', 'Architecture_Notes'],
    },
  ],
  '2': [
    {
      id: '2-a', role: 'assistant',
      content: "Notion Integration Ideas session loaded. You've explored 7 integration patterns. Let's continue.",
      timestamp: Date.now() - 86400000,
    },
    {
      id: '2-b', role: 'user',
      command: '/analyze',
      commandArgs: '--target notion_workspace',
      content: '/analyze --target notion_workspace',
      timestamp: Date.now() - 86340000,
    },
    {
      id: '2-c', role: 'assistant',
      content: "Analysis complete. Found 12 databases and 47 pages.",
      timestamp: Date.now() - 86280000,
      commandSteps: [
        { label: 'Scanning Notion workspace structure', status: 'done' },
        { label: 'Running semantic similarity analysis', status: 'done' },
        { label: 'Detecting duplicate and orphaned pages', status: 'done' },
        { label: 'Generating structural insights report', status: 'done' },
      ],
      references: ['Notion_Analysis', 'Duplicate_Report'],
    },
  ],
  '3': [
    {
      id: '3-a', role: 'assistant',
      content: "Marketing Strategy v2 session. Your last plan is in Notion. Ready to update it?",
      timestamp: Date.now() - 172800000,
    },
  ],
};

interface OrinState {
  user: OrinUser | null;
  mode: Mode;
  sessions: OrinSession[];
  currentSessionId: string | null;
  sessionMessages: Record<string, OrinMessage[]>;
  connections: OrinConnections;
  loadingStates: { sendingMessage: boolean };
}

interface OrinActions {
  setUser: (u: OrinUser | null) => void;
  setMode: (m: Mode) => void;
  setCurrentSessionId: (id: string | null) => void;
  getMessages: () => OrinMessage[];
  addMessage: (msg: OrinMessage) => void;
  updateMessage: (id: string, patch: Partial<OrinMessage>) => void;
  updateConnection: (key: keyof OrinConnections, val: boolean) => void;
  setLoading: (key: keyof OrinState['loadingStates'], val: boolean) => void;
  newSession: () => void;
}

export const useOrinStore = create<OrinState & OrinActions>((set, get) => ({
  user: null,
  mode: 'explore',
  sessions: [
    { id: '1', title: 'Project Orin Research',    createdAt: Date.now() - 7200000  },
    { id: '2', title: 'Notion Integration Ideas', createdAt: Date.now() - 86400000 },
    { id: '3', title: 'Marketing Strategy v2',    createdAt: Date.now() - 172800000 },
  ],
  currentSessionId: '1',
  sessionMessages: { ...DEMO },
  connections: { notion: true, email: false, slack: false },
  loadingStates: { sendingMessage: false },

  setUser: (user) => set({ user }),
  setMode: (mode) => set({ mode }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  getMessages: () => {
    const { currentSessionId, sessionMessages } = get();
    return currentSessionId ? (sessionMessages[currentSessionId] ?? []) : [];
  },

  addMessage: (msg) =>
    set((s) => {
      const sid = s.currentSessionId;
      if (!sid) return s;
      return {
        sessionMessages: {
          ...s.sessionMessages,
          [sid]: [...(s.sessionMessages[sid] ?? []), msg],
        },
      };
    }),

  updateMessage: (id, patch) =>
    set((s) => {
      const sid = s.currentSessionId;
      if (!sid) return s;
      return {
        sessionMessages: {
          ...s.sessionMessages,
          [sid]: (s.sessionMessages[sid] ?? []).map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        },
      };
    }),

  updateConnection: (key, val) =>
    set((s) => ({ connections: { ...s.connections, [key]: val } })),

  setLoading: (key, val) =>
    set((s) => ({ loadingStates: { ...s.loadingStates, [key]: val } })),

  newSession: () => {
    const id = `session-${Date.now()}`;
    set((s) => ({
      sessions: [{ id, title: 'New Session', createdAt: Date.now() }, ...s.sessions],
      currentSessionId: id,
      sessionMessages: { ...s.sessionMessages, [id]: [] },
    }));
  },
}));
