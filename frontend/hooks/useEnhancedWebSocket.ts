import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { websocketClient } from '@/lib/websocket';
import { WorkflowEvent, SystemMetrics, Alert, Workflow } from '@/lib/types/workflow.types';
import { workflowKeys } from './queries/useWorkflowQueries';
import { metricsKeys } from './queries/useMetricsQueries';
import { alertsKeys } from './queries/useAlertsQueries';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { useTimelineStore } from '@/stores/timeline.store';
import { useEventOrdering } from './intelligence/useEventOrdering';
import { reconciliationEngine } from '@/lib/reconciliation/reconciliation-engine';

interface VersionedMessage {
  version?: number;
  timestamp?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function useEnhancedWebSocket() {
  const queryClient = useQueryClient();
  const { updateWorkflow, updateStep } = useWorkflowStore();
  const { updateMetrics } = useMetricsStore();
  const { addAlert } = useAlertsStore();
  const { addEvent } = useTimelineStore();
  const { processEvent: processOrderedEvent } = useEventOrdering();

  const processedEventIds = useRef(new Set<string>());
  const lastEventVersion = useRef(0);
  const connectionState = useRef<ConnectionState>('disconnected');
  const metricsBuffer = useRef<SystemMetrics[]>([]);
  const metricsFlushTimer = useRef<NodeJS.Timeout | null>(null);

  // Deduplicate events
  const shouldProcessEvent = useCallback((eventId: string, version?: number) => {
    // Check if already processed
    if (processedEventIds.current.has(eventId)) {
      return false;
    }

    // Check version (ignore outdated events)
    if (version !== undefined && version < lastEventVersion.current) {
      return false;
    }

    // Mark as processed
    processedEventIds.current.add(eventId);
    
    // Cleanup old IDs (keep last 1000)
    if (processedEventIds.current.size > 1000) {
      const idsArray = Array.from(processedEventIds.current);
      processedEventIds.current = new Set(idsArray.slice(-1000));
    }

    // Update version
    if (version !== undefined) {
      lastEventVersion.current = Math.max(lastEventVersion.current, version);
    }

    return true;
  }, []);

  // Flush metrics buffer
  const flushMetrics = useCallback(() => {
    if (metricsBuffer.current.length === 0) return;

    // Use the latest metrics
    const latestMetrics = metricsBuffer.current[metricsBuffer.current.length - 1];
    updateMetrics(latestMetrics);

    // Update React Query cache
    queryClient.setQueryData(metricsKeys.current(), latestMetrics);

    metricsBuffer.current = [];
  }, [updateMetrics, queryClient]);

  // Throttled metrics update
  const handleMetricsUpdate = useCallback((metrics: SystemMetrics) => {
    metricsBuffer.current.push(metrics);

    // Clear existing timer
    if (metricsFlushTimer.current) {
      clearTimeout(metricsFlushTimer.current);
    }

    // Schedule flush
    metricsFlushTimer.current = setTimeout(() => {
      requestAnimationFrame(() => {
        flushMetrics();
      });
    }, 1000); // Batch updates every 1 second
  }, [flushMetrics]);

  // Handle workflow events with reconciliation
  const handleWorkflowEvent = useCallback((event: WorkflowEvent & VersionedMessage) => {
    const eventId = `${event.type}-${event.workflowId}-${event.stepId || ''}-${event.timestamp}`;
    
    if (!shouldProcessEvent(eventId, event.version)) {
      return;
    }

    // Process through event ordering system
    const processed = processOrderedEvent(
      event,
      event.version,
      (orderedEvent) => {
        processWorkflowEventInternal(orderedEvent);
      }
    );

    if (!processed) {
      console.log('Event queued for later processing', event);
    }
  }, [shouldProcessEvent, processOrderedEvent]);

  // Internal event processing
  const processWorkflowEventInternal = useCallback((event: WorkflowEvent & VersionedMessage) => {
    const { type, workflowId, stepId, data } = event;

    // Add to timeline
    addEvent({
      id: `${Date.now()}-${Math.random()}`,
      type,
      workflowId,
      stepId,
      timestamp: new Date(event.timestamp),
      version: event.version || 0,
      data,
      source: 'websocket',
      metadata: {},
    });

    // Update Zustand (realtime state)
    switch (type) {
      case 'workflow_started':
        updateWorkflow(workflowId, { status: 'running', startTime: new Date() });
        break;
      case 'workflow_completed':
        updateWorkflow(workflowId, {
          status: 'completed',
          endTime: new Date(),
          progress: 100,
          ...data,
        });
        break;
      case 'workflow_failed':
        updateWorkflow(workflowId, { status: 'failed', endTime: new Date(), ...data });
        break;
      case 'workflow_paused':
        updateWorkflow(workflowId, { status: 'paused' });
        break;
      case 'workflow_resumed':
        updateWorkflow(workflowId, { status: 'running' });
        break;
      case 'workflow_cancelled':
        updateWorkflow(workflowId, { status: 'cancelled', endTime: new Date() });
        break;
      case 'step_started':
        if (stepId) {
          updateStep(workflowId, stepId, { status: 'running', startTime: new Date() });
        }
        break;
      case 'step_completed':
        if (stepId) {
          updateStep(workflowId, stepId, {
            status: 'completed',
            endTime: new Date(),
            ...data,
          });
        }
        break;
      case 'step_failed':
        if (stepId) {
          updateStep(workflowId, stepId, {
            status: 'failed',
            endTime: new Date(),
            error: data?.error,
          });
        }
        break;
    }

    // Unified state reconciliation
    const cachedWorkflow = queryClient.getQueryData<Workflow>(
      workflowKeys.detail(workflowId)
    );

    if (cachedWorkflow) {
      if (cachedWorkflow._optimistic) {
        // Skip update if in optimistic state
        console.log('Skipping update for optimistic workflow', workflowId);
      } else {
        // Update React Query cache
        const updates = getWorkflowUpdates(type, data);
        const updatedWorkflow = {
          ...cachedWorkflow,
          ...updates,
          updatedAt: new Date(),
        };

        // Reconcile with Zustand state
        const zustandWorkflow = updateWorkflow(workflowId, updates);
        
        if (zustandWorkflow) {
          const reconciliation = reconciliationEngine.reconcile(
            updatedWorkflow,
            zustandWorkflow
          );

          if (reconciliation.hadConflict) {
            console.log('Reconciliation performed', reconciliation);
          }
        }

        // Update React Query cache (unified source of truth)
        queryClient.setQueryData(workflowKeys.detail(workflowId), updatedWorkflow);
      }
    }

    // Invalidate queries for confirmed state
    queryClient.invalidateQueries({ 
      queryKey: workflowKeys.detail(workflowId),
      refetchType: 'none', // Don't refetch immediately
    });
  }, [updateWorkflow, updateStep, queryClient, addEvent, processOrderedEvent]);

  // Helper to get workflow updates
  const getWorkflowUpdates = (type: string, data: any) => {
    switch (type) {
      case 'workflow_started':
        return { status: 'running', startTime: new Date() };
      case 'workflow_completed':
        return { status: 'completed', endTime: new Date(), progress: 100, ...data };
      case 'workflow_failed':
        return { status: 'failed', endTime: new Date(), ...data };
      case 'workflow_paused':
        return { status: 'paused' };
      case 'workflow_resumed':
        return { status: 'running' };
      case 'workflow_cancelled':
        return { status: 'cancelled', endTime: new Date() };
      default:
        return {};
    }
  };

  // Handle alerts
  const handleAlert = useCallback((alert: Alert & VersionedMessage) => {
    const eventId = `alert-${alert.id}-${alert.timestamp}`;
    
    if (!shouldProcessEvent(eventId, alert.version)) {
      return;
    }

    addAlert(alert);
    
    // Invalidate alerts query
    queryClient.invalidateQueries({ queryKey: alertsKeys.lists() });
  }, [shouldProcessEvent, addAlert, queryClient]);

  // Reconcile state on reconnect
  const reconcileState = useCallback(async () => {
    console.log('Reconciling state after reconnect...');
    
    // Refetch all workflows
    await queryClient.invalidateQueries({ 
      queryKey: workflowKeys.lists(),
      refetchType: 'active',
    });

    // Refetch metrics
    await queryClient.invalidateQueries({ 
      queryKey: metricsKeys.current(),
      refetchType: 'active',
    });

    // Refetch alerts
    await queryClient.invalidateQueries({ 
      queryKey: alertsKeys.lists(),
      refetchType: 'active',
    });

    console.log('State reconciliation complete');
  }, [queryClient]);

  useEffect(() => {
    // Connect to WebSocket
    connectionState.current = 'connecting';
    
    websocketClient
      .connect()
      .then(() => {
        connectionState.current = 'connected';
      })
      .catch((err) => {
        connectionState.current = 'disconnected';
        console.error('WebSocket connection failed:', err);
      });

    // Handle connection events
    const unsubConnected = websocketClient.on('connected', () => {
      const wasReconnecting = connectionState.current === 'reconnecting';
      connectionState.current = 'connected';
      
      if (wasReconnecting) {
        reconcileState();
      }
    });

    const unsubDisconnected = websocketClient.on('disconnected', () => {
      connectionState.current = 'reconnecting';
    });

    // Handle workflow events
    const unsubWorkflowEvent = websocketClient.on('workflow_event', (message) => {
      const event: WorkflowEvent & VersionedMessage = message.event;
      handleWorkflowEvent(event);
    });

    // Handle system metrics
    const unsubMetrics = websocketClient.on('system_metrics', (message) => {
      const metrics: SystemMetrics & VersionedMessage = message.metrics;
      handleMetricsUpdate(metrics);
    });

    // Handle alerts
    const unsubAlert = websocketClient.on('alert', (message) => {
      const alert: Alert & VersionedMessage = message.alert;
      handleAlert(alert);
    });

    // Cleanup
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubWorkflowEvent();
      unsubMetrics();
      unsubAlert();
      
      if (metricsFlushTimer.current) {
        clearTimeout(metricsFlushTimer.current);
      }
    };
  }, [handleWorkflowEvent, handleMetricsUpdate, handleAlert, reconcileState]);

  const subscribe = useCallback((workflowId: string) => {
    websocketClient.subscribe(workflowId);
  }, []);

  const unsubscribe = useCallback((workflowId: string) => {
    websocketClient.unsubscribe(workflowId);
  }, []);

  return {
    connectionState: connectionState.current,
    isConnected: connectionState.current === 'connected',
    subscribe,
    unsubscribe,
  };
}
