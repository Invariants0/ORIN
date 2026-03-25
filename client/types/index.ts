export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  references?: string[];
}

export interface Session {
  id: string;
  title: string;
  summary?: string;
  createdAt: number;
}

export type Mode = 'explore' | 'build' | 'capture';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Connections {
  notion: boolean;
  email: boolean;
  slack: boolean;
}

export interface OrinState {
  user: User | null;
  isAuthenticated: boolean;
  mode: Mode;
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  connections: Connections;
  loadingStates: {
    sendingMessage: boolean;
    fetchingSessions: boolean;
  };
}
