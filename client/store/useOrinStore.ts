import { create } from 'zustand';
import { OrinState, User, Session, Message, Mode } from '../types';

interface OrinActions {
  setUser: (user: User | null) => void;
  setAuthenticated: (auth: boolean) => void;
  setMode: (mode: Mode) => void;
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateConnection: (key: keyof OrinState['connections'], value: boolean) => void;
  setLoading: (key: keyof OrinState['loadingStates'], value: boolean) => void;
}

export const useOrinStore = create<OrinState & OrinActions>((set) => ({
  user: null,
  isAuthenticated: false,
  mode: 'explore',
  sessions: [
    { id: '1', title: 'Project Orin Research', createdAt: Date.now() - 86400000 },
    { id: '2', title: 'Notion Integration Ideas', createdAt: Date.now() - 172800000 },
    { id: '3', title: 'Marketing Strategy v2', createdAt: Date.now() - 259200000 },
  ],
  currentSessionId: '1',
  messages: [
    { id: '1', role: 'assistant', content: "Welcome back! I've analyzed your recent Notion research. What would you like to explore today?", timestamp: Date.now() - 3600000 },
    { id: '2', role: 'user', content: "What were the main takeaways from my research on multimodal AI?", timestamp: Date.now() - 3500000 },
    { id: '3', role: 'assistant', content: "The main takeaways were: 1. Multimodality is becoming the standard for LLMs. 2. Agentic workflows are the next frontier. 3. Context retrieval is the bottleneck for performance.", timestamp: Date.now() - 3400000, references: ['Research_Notes.pdf', 'AI_Trends_2026'] },
  ],
  connections: {
    notion: true,
    email: false,
    slack: false,
  },
  loadingStates: {
    sendingMessage: false,
    fetchingSessions: false,
  },

  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setMode: (mode) => set({ mode }),
  setSessions: (sessions) => set({ sessions }),
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateConnection: (key, value) =>
    set((state) => ({
      connections: { ...state.connections, [key]: value },
    })),
  setLoading: (key, value) =>
    set((state) => ({
      loadingStates: { ...state.loadingStates, [key]: value },
    })),
}));
