import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAction, UserBehavior, Suggestion } from '@/lib/types/intelligence.types';
import { suggestionEngine } from '@/lib/intelligence/suggestion-engine';

interface UserIntelligenceConfig {
  trackingEnabled?: boolean;
  maxActions?: number;
  analysisInterval?: number; // ms
}

export function useUserIntelligence(config: UserIntelligenceConfig = {}) {
  const {
    trackingEnabled = true,
    maxActions = 1000,
    analysisInterval = 60000, // 1 minute
  } = config;

  const [behavior, setBehavior] = useState<UserBehavior>({
    actions: [],
    patterns: {
      frequentWorkflows: [],
      commonActions: [],
      timeOfDayPatterns: {},
      errorRecoveryPatterns: [],
    },
    preferences: {
      autoRetry: false,
      notificationLevel: 'important',
      theme: 'auto',
    },
  });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const actionBuffer = useRef<UserAction[]>([]);

  // Track user action
  const trackAction = useCallback(
    (type: string, workflowId?: string, context?: any) => {
      if (!trackingEnabled) return;

      const action: UserAction = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        workflowId,
        timestamp: new Date(),
        context,
      };

      actionBuffer.current.push(action);

      // Limit buffer size
      if (actionBuffer.current.length > maxActions) {
        actionBuffer.current.shift();
      }
    },
    [trackingEnabled, maxActions]
  );

  // Analyze patterns
  const analyzePatterns = useCallback(() => {
    const actions = actionBuffer.current;
    if (actions.length < 10) return; // Need minimum data

    // Analyze frequent workflows
    const workflowCounts = new Map<string, number>();
    actions.forEach((action) => {
      if (action.workflowId) {
        const count = workflowCounts.get(action.workflowId) || 0;
        workflowCounts.set(action.workflowId, count + 1);
      }
    });

    const frequentWorkflows = Array.from(workflowCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    // Analyze common actions
    const actionCounts = new Map<string, number>();
    actions.forEach((action) => {
      const count = actionCounts.get(action.type) || 0;
      actionCounts.set(action.type, count + 1);
    });

    const commonActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    // Analyze time of day patterns
    const timeOfDayPatterns: Record<string, number> = {};
    actions.forEach((action) => {
      const hour = action.timestamp.getHours();
      const key = `${hour}:00`;
      timeOfDayPatterns[key] = (timeOfDayPatterns[key] || 0) + 1;
    });

    // Analyze error recovery patterns
    const errorRecoveryPatterns: string[] = [];
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];

      if (
        prev.type === 'workflow_failed' &&
        curr.type === 'retry' &&
        prev.workflowId === curr.workflowId
      ) {
        errorRecoveryPatterns.push('immediate_retry');
      }
    }

    // Update behavior
    setBehavior((prev) => ({
      ...prev,
      actions: [...actions],
      patterns: {
        frequentWorkflows,
        commonActions,
        timeOfDayPatterns,
        errorRecoveryPatterns: [...new Set(errorRecoveryPatterns)],
      },
    }));

    // Generate suggestions
    const automationSuggestions = suggestionEngine.generateAutomationSuggestions(
      commonActions,
      frequentWorkflows
    );

    setSuggestions(automationSuggestions);
  }, []);

  // Periodic analysis
  useEffect(() => {
    if (!trackingEnabled) return;

    const interval = setInterval(analyzePatterns, analysisInterval);
    return () => clearInterval(interval);
  }, [trackingEnabled, analysisInterval, analyzePatterns]);

  // Get next best action
  const getNextBestAction = useCallback(
    (currentWorkflowId?: string): string | null => {
      const { patterns } = behavior;

      // If user is viewing a workflow, suggest related actions
      if (currentWorkflowId) {
        const recentActions = actionBuffer.current
          .filter((a) => a.workflowId === currentWorkflowId)
          .slice(-5);

        if (recentActions.length > 0) {
          const lastAction = recentActions[recentActions.length - 1];

          // Suggest based on last action
          if (lastAction.type === 'pause') {
            return 'resume';
          } else if (lastAction.type === 'workflow_failed') {
            return 'retry';
          }
        }
      }

      // Suggest based on patterns
      if (patterns.commonActions.length > 0) {
        return patterns.commonActions[0];
      }

      return null;
    },
    [behavior]
  );

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<UserBehavior['preferences']>) => {
      setBehavior((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ...updates,
        },
      }));
    },
    []
  );

  // Clear tracking data
  const clearTracking = useCallback(() => {
    actionBuffer.current = [];
    setBehavior({
      actions: [],
      patterns: {
        frequentWorkflows: [],
        commonActions: [],
        timeOfDayPatterns: {},
        errorRecoveryPatterns: [],
      },
      preferences: behavior.preferences,
    });
    setSuggestions([]);
  }, [behavior.preferences]);

  // Export data
  const exportData = useCallback((): string => {
    return JSON.stringify(behavior, null, 2);
  }, [behavior]);

  return {
    behavior,
    suggestions,
    trackAction,
    analyzePatterns,
    getNextBestAction,
    updatePreferences,
    clearTracking,
    exportData,
  };
}
