import { create } from 'zustand';

export type Role = 'user' | 'assistant';

export interface CommandStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

export interface OrinMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  references?: string[];
  command?: string;
  commandArgs?: string;
  commandSteps?: CommandStep[];
  isStreaming?: boolean;
  metadata?: any;
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
  avatar?: string;
  geminiKey?: string;
  notionRestAccessToken?: string;
  notionMcpAccessToken?: string;
}

export interface OrinConnections {
  notion: boolean;
  email: boolean;
  slack: boolean;
}

interface OrinState {
  user: OrinUser | null;
  mode: Mode;
  sessions: OrinSession[];
  currentSessionId: string | null;
  sessionMessages: Record<string, OrinMessage[]>;
  connections: OrinConnections;
  loadingStates: { sendingMessage: boolean };
  isAccountOpen: boolean;
}

interface OrinActions {
  setUser: (u: OrinUser | null) => void;
  setMode: (m: Mode) => void;
  setCurrentSessionId: (id: string | null) => void;
  setSessions: (sessions: OrinSession[]) => void;
  setSessionMessages: (id: string, messages: OrinMessage[]) => void;
  promoteSession: (tempId: string, realId: string) => void;
  removeSession: (id: string) => void;
  getMessages: () => OrinMessage[];
  addMessage: (msg: OrinMessage) => void;
  updateMessage: (id: string, patch: Partial<OrinMessage>) => void;
  updateConnection: (key: keyof OrinConnections, val: boolean) => void;
  setLoading: (key: keyof OrinState['loadingStates'], val: boolean) => void;
  newSession: () => void;
  setSession: (id: string) => void;
  setIsAccountOpen: (open: boolean) => void;
}

export const useOrinStore = create<OrinState & OrinActions>((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  user: null,
  mode: 'explore',
  sessions: [],            // populated by React Query / API
  currentSessionId: null,  // set after sessions load
  sessionMessages: {},     // populated on session select
  connections: { notion: false, email: false, slack: false },
  loadingStates: { sendingMessage: false },
  isAccountOpen: false,

  // ── Actions ────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),
  setMode: (mode) => set({ mode }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setSession: (id) => set({ currentSessionId: id }),
  setSessions: (sessions) => set({ sessions }),
  setSessionMessages: (id, messages) =>
    set((s) => ({
      sessionMessages: { ...s.sessionMessages, [id]: messages },
    })),
  promoteSession: (tempId, realId) =>
    set((s) => {
      const tempMessages = s.sessionMessages[tempId] ?? [];
      const { [tempId]: _removed, ...restMessages } = s.sessionMessages;
      void _removed;
      return {
        currentSessionId: realId,
        sessionMessages: {
          ...restMessages,
          [realId]: [...tempMessages],
        },
      };
    }),
  removeSession: (id) =>
    set((s) => {
      const nextSessions = s.sessions.filter((session) => session.id !== id);
      const { [id]: _removed, ...restMessages } = s.sessionMessages;
      void _removed;
      const isCurrent = s.currentSessionId === id;
      return {
        sessions: nextSessions,
        sessionMessages: restMessages,
        currentSessionId: isCurrent ? (nextSessions[0]?.id ?? null) : s.currentSessionId,
      };
    }),

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
      currentSessionId: id,
      sessionMessages: { ...s.sessionMessages, [id]: [] },
    }));
  },

  setIsAccountOpen: (open) => set({ isAccountOpen: open }),
}));
