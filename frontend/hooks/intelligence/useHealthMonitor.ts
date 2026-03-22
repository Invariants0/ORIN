import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflow.store';
import { HealthCheck } from '@/lib/types/intelligence.types';
import { workflowKeys } from '../queries/useWorkflowQueries';
import { Workflow } from '@/lib/types/workflow.types';

interface HealthMonitorConfig {
  checkInterval?: number; // ms
  staleThreshold?: number; // ms
  optimisticTimeout?: number; // ms
  autoHeal?: boolean;
}

export function useHealthMonitor(config: HealthMonitorConfig = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    staleThreshold = 300000, // 5 minutes
    optimisticTimeout = 30000, // 30 seconds
    autoHeal = true,
  } = config;

  const queryClient = useQueryClient();
  const workflowStore = useWorkflowStore();
  
  const [health, setHealth] = useState<HealthCheck>({
    timestamp: new Date(),
    isHealthy: true,
    issues: {
      staleWorkflows: [],
      missingUpdates: [],
      inconsistentStates: [],
      orphanedOptimistic: [],
      versionConflicts: [],
    },
    metrics: {
      totalWorkflows: 0,
      healthyWorkflows: 0,
      issueCount: 0,
    },
  });

  const [isHealing, setIsHealing] = useState(false);
  const healingInProgress = useRef(false);

  // Perform health check
  const performHealthCheck = useCallback((): HealthCheck => {
    const now = Date.now();
    const workflows = workflowStore.getAllWorkflows();
    
    const issues: HealthCheck['issues'] = {
      staleWorkflows: [],
      missingUpdates: [],
      inconsistentStates: [],
      orphanedOptimistic: [],
      versionConflicts: [],
    };

    workflows.forEach(workflow => {
      // Check for stale workflows (no updates in 5+ minutes)
      const updatedAt = new Date(workflow.updatedAt).getTime();
      if (
        workflow.status === 'running' &&
        now - updatedAt > staleThreshold
      ) {
        issues.staleWorkflows.push(workflow.id);
      }

      // Check for orphaned optimistic updates
      if (workflow._optimistic) {
        const optimisticAge = now - workflow._optimistic.timestamp;
        if (optimisticAge > optimisticTimeout) {
          issues.orphanedOptimistic.push(workflow.id);
        }
      }

      // Check for inconsistent states (Zustand vs Query cache)
      const cachedWorkflow = queryClient.getQueryData<Workflow>(
        workflowKeys.detail(workflow.id)
      );

      if (cachedWorkflow) {
        const hasInconsistency = checkInconsistency(workflow, cachedWorkflow);
        if (hasInconsistency) {
          issues.inconsistentStates.push(workflow.id);
        }
      }
    });

    const totalIssues = Object.values(issues).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    const healthCheck: HealthCheck = {
      timestamp: new Date(),
      isHealthy: totalIssues === 0,
      issues,
      metrics: {
        totalWorkflows: workflows.length,
        healthyWorkflows: workflows.length - totalIssues,
        issueCount: totalIssues,
      },
    };

    return healthCheck;
  }, [
    workflowStore,
    queryClient,
    staleThreshold,
    optimisticTimeout,
  ]);

  // Check for inconsistencies between two workflow states
  const checkInconsistency = (
    zustandState: Workflow,
    queryState: Workflow
  ): boolean => {
    // Ignore optimistic fields
    if (zustandState._optimistic || queryState._optimistic) {
      return false;
    }

    // Check critical fields
    const criticalFields: (keyof Workflow)[] = [
      'status',
      'progress',
      'startTime',
      'endTime',
    ];

    return criticalFields.some(field => {
      const zustandValue = zustandState[field];
      const queryValue = queryState[field];

      // Handle dates
      if (zustandValue instanceof Date && queryValue instanceof Date) {
        return zustandValue.getTime() !== queryValue.getTime();
      }

      return zustandValue !== queryValue;
    });
  };

  // Heal specific issue
  const healIssue = useCallback(async (
    issueType: keyof HealthCheck['issues'],
    workflowId: string
  ) => {
    console.log(`Healing ${issueType} for workflow ${workflowId}`);

    switch (issueType) {
      case 'staleWorkflows':
        // Refetch workflow data
        await queryClient.invalidateQueries({
          queryKey: workflowKeys.detail(workflowId),
        });
        break;

      case 'orphanedOptimistic':
        // Remove optimistic flag
        workflowStore.updateWorkflow(workflowId, {
          _optimistic: undefined,
        });
        // Refetch to get actual state
        await queryClient.invalidateQueries({
          queryKey: workflowKeys.detail(workflowId),
        });
        break;

      case 'inconsistentStates':
        // Reconcile by refetching (server wins)
        await queryClient.invalidateQueries({
          queryKey: workflowKeys.detail(workflowId),
        });
        break;

      case 'versionConflicts':
        // Refetch to resolve version conflicts
        await queryClient.invalidateQueries({
          queryKey: workflowKeys.detail(workflowId),
        });
        break;

      case 'missingUpdates':
        // Request full sync
        await queryClient.invalidateQueries({
          queryKey: workflowKeys.lists(),
        });
        break;
    }
  }, [queryClient, workflowStore]);

  // Heal all issues
  const heal = useCallback(async () => {
    if (healingInProgress.current) {
      console.log('Healing already in progress');
      return;
    }

    healingInProgress.current = true;
    setIsHealing(true);

    try {
      const currentHealth = performHealthCheck();
      const { issues } = currentHealth;

      console.log('Starting healing process', issues);

      // Heal each type of issue
      for (const [issueType, workflowIds] of Object.entries(issues)) {
        for (const workflowId of workflowIds) {
          await healIssue(
            issueType as keyof HealthCheck['issues'],
            workflowId
          );
        }
      }

      // Perform another health check
      const newHealth = performHealthCheck();
      setHealth(newHealth);

      console.log('Healing complete', newHealth);
    } catch (error) {
      console.error('Healing failed', error);
    } finally {
      healingInProgress.current = false;
      setIsHealing(false);
    }
  }, [performHealthCheck, healIssue]);

  // Periodic health checks
  useEffect(() => {
    const checkHealth = () => {
      const healthCheck = performHealthCheck();
      setHealth(healthCheck);

      // Auto-heal if enabled and unhealthy
      if (autoHeal && !healthCheck.isHealthy && !healingInProgress.current) {
        console.log('Auto-healing triggered');
        heal();
      }
    };

    // Initial check
    checkHealth();

    // Periodic checks
    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [performHealthCheck, heal, autoHeal, checkInterval]);

  // Manual health check
  const checkNow = useCallback(() => {
    const healthCheck = performHealthCheck();
    setHealth(healthCheck);
    return healthCheck;
  }, [performHealthCheck]);

  return {
    health,
    isHealthy: health.isHealthy,
    isHealing,
    heal,
    checkNow,
    healIssue,
  };
}
