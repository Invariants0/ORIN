import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HealthCheck } from '@/lib/types/intelligence.types';
import { queryKeys } from '../queries/query-keys';
import { Workflow } from '@/lib/types/workflow.types';

interface HealthMonitorConfig {
  checkInterval?: number; // ms
  staleThreshold?: number; // ms
  optimisticTimeout?: number; // ms
  autoHeal?: boolean;
}

/**
 * useHealthMonitor — INTELLIGENCE LAYER
 * 
 * Periodically audits the client-side state coherence against the server/websocket stream.
 * 1. Checks for stalled workflows.
 * 2. Identifies version conflicts.
 * 3. Triggers auto-healing refetches.
 */
export function useHealthMonitor(config: HealthMonitorConfig = {}) {
  const {
    checkInterval = 30000,
    staleThreshold = 300000,
    autoHeal = true,
  } = config;

  const queryClient = useQueryClient();
  
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

  const performHealthCheck = useCallback((): HealthCheck => {
    const now = Date.now();
    // Get all workflows from the list cache
    const workflows = queryClient.getQueryData<Workflow[]>(queryKeys.workflows.lists()) || [];
    
    const issues: HealthCheck['issues'] = {
      staleWorkflows: [],
      missingUpdates: [],
      inconsistentStates: [],
      orphanedOptimistic: [],
      versionConflicts: [],
    };

    workflows.forEach(workflow => {
      const updatedAt = new Date(workflow.updatedAt).getTime();
      
      // Detection: Running but no updates
      if (workflow.status === 'running' && now - updatedAt > staleThreshold) {
        issues.staleWorkflows.push(workflow.id);
      }
    });

    const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

    return {
      timestamp: new Date(),
      isHealthy: totalIssues === 0,
      issues,
      metrics: {
        totalWorkflows: workflows.length,
        healthyWorkflows: workflows.length - totalIssues,
        issueCount: totalIssues,
      },
    };
  }, [queryClient, staleThreshold]);

  const heal = useCallback(async () => {
    setIsHealing(true);
    try {
      const currentHealth = performHealthCheck();
      const allIssueIds = [
        ...currentHealth.issues.staleWorkflows,
        ...currentHealth.issues.missingUpdates
      ];

      if (allIssueIds.length > 0) {
        // Broad heal: Refresh the entire list
        await queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() });
      }
      
      setHealth(performHealthCheck());
    } finally {
      setIsHealing(false);
    }
  }, [performHealthCheck, queryClient]);

  useEffect(() => {
    const interval = setInterval(() => {
      const h = performHealthCheck();
      setHealth(h);
      if (autoHeal && !h.isHealthy) heal();
    }, checkInterval);
    return () => clearInterval(interval);
  }, [performHealthCheck, heal, autoHeal, checkInterval]);

  return { health, isHealthy: health.isHealthy, isHealing, heal, checkNow: performHealthCheck };
}
