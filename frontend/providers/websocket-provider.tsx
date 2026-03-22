'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface WebSocketContextValue {
  connectionState: ConnectionState;
  isConnected: boolean;
  subscribe: (workflowId: string) => void;
  unsubscribe: (workflowId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useEnhancedWebSocket();

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
