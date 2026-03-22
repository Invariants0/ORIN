import { create } from 'zustand';
import { SmartAlert } from '@/lib/types/intelligence.types';

interface SmartAlertsState {
  alerts: SmartAlert[];
  groups: Map<string, SmartAlert[]>;
  escalationThresholds: {
    warning: number; // occurrences to escalate to warning
    error: number; // occurrences to escalate to error
    critical: number; // occurrences to escalate to critical
  };

  // Actions
  addAlert: (alert: Omit<SmartAlert, 'occurrences' | 'firstSeen' | 'lastSeen' | 'escalationLevel'>) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeGroup: (groupId: string) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
  clearAcknowledged: () => void;
  getAlertsByWorkflow: (workflowId: string) => SmartAlert[];
  getAlertsBySeverity: (severity: SmartAlert['severity']) => SmartAlert[];
  getUnacknowledgedCount: () => number;
}

export const useSmartAlertsStore = create<SmartAlertsState>((set, get) => ({
  alerts: [],
  groups: new Map(),
  escalationThresholds: {
    warning: 3,
    error: 5,
    critical: 10,
  },

  addAlert: (newAlert) =>
    set((state) => {
      const now = new Date();
      
      // Check for existing similar alert
      const existing = state.alerts.find(
        (a) =>
          a.message === newAlert.message &&
          a.workflowId === newAlert.workflowId &&
          !a.acknowledged
      );

      if (existing) {
        // Update existing alert (deduplication)
        const occurrences = existing.occurrences + 1;
        
        // Determine escalation level
        let escalationLevel = existing.escalationLevel;
        let severity = existing.severity;

        if (occurrences >= state.escalationThresholds.critical) {
          escalationLevel = 3;
          severity = 'critical';
        } else if (occurrences >= state.escalationThresholds.error) {
          escalationLevel = 2;
          severity = 'error';
        } else if (occurrences >= state.escalationThresholds.warning) {
          escalationLevel = 1;
          severity = 'warning';
        }

        const updated = state.alerts.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                occurrences,
                lastSeen: now,
                escalationLevel,
                severity,
              }
            : a
        );

        return { alerts: updated };
      }

      // Create new alert
      const alert: SmartAlert = {
        ...newAlert,
        occurrences: 1,
        firstSeen: now,
        lastSeen: now,
        escalationLevel: 0,
      };

      // Group similar alerts
      const groupId = newAlert.groupId || `${newAlert.workflowId}-${newAlert.severity}`;
      alert.groupId = groupId;

      // Find related alerts
      const relatedAlerts = state.alerts
        .filter(
          (a) =>
            a.workflowId === alert.workflowId &&
            a.id !== alert.id &&
            Math.abs(a.lastSeen.getTime() - now.getTime()) < 300000 // Within 5 minutes
        )
        .map((a) => a.id);

      alert.relatedAlerts = relatedAlerts;

      const alerts = [alert, ...state.alerts];

      // Update groups
      const groups = new Map(state.groups);
      const groupAlerts = groups.get(groupId) || [];
      groups.set(groupId, [...groupAlerts, alert]);

      return { alerts, groups };
    }),

  acknowledgeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      );
      return { alerts };
    }),

  acknowledgeGroup: (groupId) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.groupId === groupId ? { ...a, acknowledged: true } : a
      );
      return { alerts };
    }),

  removeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.filter((a) => a.id !== id);
      return { alerts };
    }),

  clearAlerts: () => set({ alerts: [], groups: new Map() }),

  clearAcknowledged: () =>
    set((state) => {
      const alerts = state.alerts.filter((a) => !a.acknowledged);
      
      // Rebuild groups
      const groups = new Map<string, SmartAlert[]>();
      alerts.forEach((alert) => {
        if (alert.groupId) {
          const groupAlerts = groups.get(alert.groupId) || [];
          groups.set(alert.groupId, [...groupAlerts, alert]);
        }
      });

      return { alerts, groups };
    }),

  getAlertsByWorkflow: (workflowId) => {
    const { alerts } = get();
    return alerts.filter((a) => a.workflowId === workflowId);
  },

  getAlertsBySeverity: (severity) => {
    const { alerts } = get();
    return alerts.filter((a) => a.severity === severity);
  },

  getUnacknowledgedCount: () => {
    const { alerts } = get();
    return alerts.filter((a) => !a.acknowledged).length;
  },
}));
