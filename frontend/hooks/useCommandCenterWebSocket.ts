/**
 * Phase 4 — useCommandCenterWebSocket
 *
 * Replaces the setTimeout-based simulation with a real WebSocket connection
 * to the backend. Maps incoming WS events to the CommandCenterStore.
 *
 * Expected backend WS event schema:
 *   { type: 'step_update', logId, stepId, completed }
 *   { type: 'log_update',  logId, updates: Partial<ExecutionLogItem> }
 *   { type: 'connection',  status: 'connected' | 'disconnected' }
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCommandCenterStore } from '@/stores/useCommandCenterStore';
import { API_URL } from '@/lib/constants';

// Derive WS URL from the API base URL
const WS_URL = API_URL.replace(/^http/, 'ws').replace(/\/api\/v1$/, '');

type WsEventType = 'step_update' | 'log_update' | 'connection' | 'ping';

interface WsEvent {
  type: WsEventType;
  logId?: string;
  stepId?: string;
  completed?: boolean;
  updates?: Record<string, any>;
  status?: 'connected' | 'disconnected';
}

export function useCommandCenterWebSocket(sessionId?: string | null) {
  const { setConnectionStatus, updateLog, updateStep } = useCommandCenterStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: WsEvent = JSON.parse(event.data);

        switch (msg.type) {
          case 'step_update':
            if (msg.logId && msg.stepId && msg.completed !== undefined) {
              updateStep(msg.logId, msg.stepId, msg.completed);
            }
            break;

          case 'log_update':
            if (msg.logId && msg.updates) {
              updateLog(msg.logId, msg.updates);
            }
            break;

          case 'connection':
            if (msg.status) {
              setConnectionStatus(msg.status);
            }
            break;

          case 'ping':
            wsRef.current?.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('[CommandCenterWS] Failed to parse message:', err);
      }
    },
    [updateStep, updateLog, setConnectionStatus]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = sessionId ? `${WS_URL}/ws/commands?session=${sessionId}` : `${WS_URL}/ws/commands`;

    setConnectionStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus('connected');
    ws.onmessage = handleMessage;
    ws.onerror = () => console.error('[CommandCenterWS] WebSocket error');
    ws.onclose = () => {
      setConnectionStatus('disconnected');
      // Auto-reconnect after 3s on unexpected close
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
  }, [sessionId, handleMessage, setConnectionStatus]);

  useEffect(() => {
    connect();

    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      setConnectionStatus('disconnected');
    };
  }, [connect, setConnectionStatus]);

  /** Imperatively send a message to the backend WS */
  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { send };
}
