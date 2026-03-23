import { useEffect, useState, useCallback } from 'react';
import { websocketClient } from '@/lib/websocket';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useMetricsStore } from '@/stores/metrics.store';
import { useAlertsStore } from '@/stores/alerts.store';
import { WorkflowEvent, SystemMetrics, Alert } from '@/lib/types/workflow.types';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateWorkflow, updateStep } = useWorkflowStore();
  const { updateMetrics } = useMetricsStore();
  const { addAlert } = useAlertsStore();

  const handleWorkflowEvent = useCallback((event: WorkflowEvent) => {
    const { type, workflowId, stepId, data } = event;

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
        updateWorkflow(workflowId, {
          status: 'failed',
          endTime: new Date(),
          ...data,
        });
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
            error: (data as any)?.error,
          });
        }
        break;
    }
  }, [updateWorkflow, updateStep]);

  const subscribe = useCallback((workflowId: string) => {
    websocketClient.subscribe(workflowId);
  }, []);

  const unsubscribe = useCallback((workflowId: string) => {
    websocketClient.unsubscribe(workflowId);
  }, []);

  const send = useCallback((message: Record<string, unknown>) => {
    websocketClient.send(message as any);
  }, []);

  useEffect(() => {
    // Connect to WebSocket
    websocketClient
      .connect()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setIsConnected(false);
      });

    // Handle connection status
    const unsubConnected = websocketClient.on('connected', () => {
      setIsConnected(true);
      setError(null);
    });

    // Handle workflow events
    const unsubWorkflowEvent = websocketClient.on('workflow_event', (message) => {
      const event: WorkflowEvent = message.event;
      handleWorkflowEvent(event);
    });

    // Handle system metrics
    const unsubMetrics = websocketClient.on('system_metrics', (message) => {
      const metrics: SystemMetrics = message.metrics;
      updateMetrics(metrics);
    });

    // Handle alerts
    const unsubAlert = websocketClient.on('alert', (message) => {
      const alert: Alert = message.alert;
      addAlert(alert);
    });

    // Cleanup
    return () => {
      unsubConnected();
      unsubWorkflowEvent();
      unsubMetrics();
      unsubAlert();
    };
  }, [addAlert, handleWorkflowEvent, updateMetrics]);

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe,
    send,
  };
}
