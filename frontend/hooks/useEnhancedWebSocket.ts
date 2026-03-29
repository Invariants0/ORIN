import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { websocketClient } from '@/lib/websocket';
import { WorkflowEvent, SystemMetrics, Alert, Workflow } from '@/lib/types/workflow.types';
import { queryKeys } from './queries/query-keys';
import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { useTimelineStore } from '@/stores/timeline.store';
import { useOrinStore } from '@/stores/useOrinStore';

interface VersionedMessage {
  version?: number;
  timestamp?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/**
 * useEnhancedWebSocket — PRODUCTION ARCHITECTURE
 * 
 * 1. Manages a global realtime event stream.
 * 2. Deduplicates and orders incoming events.
 * 3. Updates TanStack Query cache directly (Unified Source of Truth).
 * 4. Routes ephemeral notifications to specialized stores.
 */
export function useEnhancedWebSocket() {
  const queryClient = useQueryClient();
  const { updateMetrics } = useMetricsStore();
  const { addAlert } = useAlertsStore();
  const { addEvent } = useTimelineStore();

  const processedEventIds = useRef(new Set<string>());
  const lastEventVersion = useRef(0);
  const connectionState = useRef<ConnectionState>('disconnected');
  const metricsBuffer = useRef<SystemMetrics[]>([]);
  const metricsFlushTimer = useRef<NodeJS.Timeout | null>(null);

  // Deduplicate events to prevent double-processing on flakey connections
  const shouldProcessEvent = useCallback((eventId: string, version?: number) => {
    if (processedEventIds.current.has(eventId)) return false;
    if (version !== undefined && version < lastEventVersion.current) return false;

    processedEventIds.current.add(eventId);
    if (processedEventIds.current.size > 1000) {
      const idsArray = Array.from(processedEventIds.current);
      processedEventIds.current = new Set(idsArray.slice(-1000));
    }

    if (version !== undefined) {
      lastEventVersion.current = Math.max(lastEventVersion.current, version);
    }
    return true;
  }, []);

  // Throttled metrics update logic (perf optimization)
  const flushMetrics = useCallback(() => {
    if (metricsBuffer.current.length === 0) return;
    const latestMetrics = metricsBuffer.current[metricsBuffer.current.length - 1];
    updateMetrics(latestMetrics);
    queryClient.setQueryData(queryKeys.workflows.metrics(), latestMetrics);
    metricsBuffer.current = [];
  }, [updateMetrics, queryClient]);

  const handleMetricsUpdate = useCallback((metrics: SystemMetrics) => {
    metricsBuffer.current.push(metrics);
    if (metricsFlushTimer.current) clearTimeout(metricsFlushTimer.current);
    metricsFlushTimer.current = setTimeout(() => {
      requestAnimationFrame(() => flushMetrics());
    }, 1000);
  }, [flushMetrics]);

  // Unified Workflow Event Processing
  const handleWorkflowEvent = useCallback((event: WorkflowEvent & VersionedMessage) => {
    const { type, workflowId, stepId, data } = event;
    const eventId = `${type}-${workflowId}-${stepId || ''}-${event.timestamp}`;
    if (!shouldProcessEvent(eventId, event.version)) return;

    // 1. Add to Audit Timeline
    addEvent({
      id: `${Date.now()}-${Math.random()}`,
      type, workflowId, stepId,
      timestamp: new Date(event.timestamp!),
      version: event.version || 0,
      data, source: 'websocket',
      metadata: {},
    });

    // 2. Update TanStack Query Cache (The ONLY source of truth)
    const updates = getWorkflowUpdates(type, data, stepId);

    // Update Detail Cache
    queryClient.setQueryData<Workflow>(queryKeys.workflows.detail(workflowId), (old) => {
      if (!old) return old;
      if (stepId) {
        return {
          ...old,
          steps: old.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
          updatedAt: new Date()
        } as Workflow;
      }
      return { ...old, ...updates, updatedAt: new Date() };
    });

    // Update List Cache (Keep UI in sync across views)
    queryClient.setQueryData<Workflow[]>(queryKeys.workflows.lists(), (old) => {
      if (!old) return old;
      return old.map(w => {
        if (w.id !== workflowId) return w;
        if (stepId) {
          return {
            ...w,
            steps: w.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
            updatedAt: new Date()
          } as Workflow;
        }
        return { ...w, ...updates, updatedAt: new Date() };
      });
    });
  }, [queryClient, addEvent, shouldProcessEvent]);

  // Helper to get partial workflow updates from event types
  const getWorkflowUpdates = (type: string, data: any, stepId?: string) => {
    if (stepId) {
      switch (type) {
        case 'step_started': return { status: 'running', startTime: new Date() };
        case 'step_completed': return { status: 'completed', endTime: new Date(), ...data };
        case 'step_failed': return { status: 'failed', endTime: new Date(), error: data?.error };
        default: return {};
      }
    }
    switch (type) {
      case 'workflow_started': return { status: 'running', startTime: new Date() };
      case 'workflow_completed': return { status: 'completed', endTime: new Date(), progress: 100, ...data };
      case 'workflow_failed': return { status: 'failed', endTime: new Date(), ...data };
      case 'workflow_paused': return { status: 'paused' };
      case 'workflow_resumed': return { status: 'running' };
      case 'workflow_cancelled': return { status: 'cancelled', endTime: new Date() };
      default: return {};
    }
  };

  const handleAlert = useCallback((alert: Alert & VersionedMessage) => {
    const eventId = `alert-${alert.id}-${alert.timestamp}`;
    if (!shouldProcessEvent(eventId, alert.version)) return;
    addAlert(alert);
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  }, [shouldProcessEvent, addAlert, queryClient]);

  const handleChatProgress = useCallback((payload: { status: string, sessionId?: string }) => {
    const { updateMessage, sessionMessages, currentSessionId } = useOrinStore.getState();
    const sid = currentSessionId;
    if (!sid) return;

    const messages = sessionMessages[sid] || [];
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.isStreaming);
    
    if (lastAssistantMsg) {
      updateMessage(lastAssistantMsg.id, {
        commandSteps: [{ label: payload.status, status: 'running' }]
      });
    }
  }, []);

  const reconcileState = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists(), refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.metrics(), refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all, refetchType: 'active' }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    connectionState.current = 'connecting';
    websocketClient.connect()
      .then(() => { connectionState.current = 'connected'; })
      .catch(() => { connectionState.current = 'disconnected'; });

    const unsubConnected = websocketClient.on('connected', () => {
      const wasReconnecting = connectionState.current === 'reconnecting';
      connectionState.current = 'connected';
      if (wasReconnecting) reconcileState();
    });

    const unsubDisconnected = websocketClient.on('disconnected', () => {
      connectionState.current = 'reconnecting';
    });

    const unsubWorkflowEvent = websocketClient.on('workflow_event', (message) => handleWorkflowEvent(message.event));
    const unsubMetrics = websocketClient.on('system_metrics', (message) => handleMetricsUpdate(message.metrics));
    const unsubAlert = websocketClient.on('alert', (message) => handleAlert(message.alert));
    const unsubChatProgress = websocketClient.on('chat_progress', (message) => handleChatProgress(message));

    return () => {
      unsubConnected(); unsubDisconnected(); unsubWorkflowEvent();
      unsubMetrics(); unsubAlert(); unsubChatProgress();
      if (metricsFlushTimer.current) clearTimeout(metricsFlushTimer.current);
    };
  }, [handleWorkflowEvent, handleMetricsUpdate, handleAlert, reconcileState]);

  return {
    connectionState: connectionState.current,
    isConnected: connectionState.current === 'connected',
    subscribe: useCallback((workflowId: string) => websocketClient.subscribe(workflowId), []),
    unsubscribe: useCallback((workflowId: string) => websocketClient.unsubscribe(workflowId), []),
  };
}
