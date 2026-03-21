import { create } from 'zustand';
import { Alert } from '@/lib/types/workflow.types';

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  
  // Actions
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  clearAcknowledged: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) =>
    set((state) => {
      const alerts = [alert, ...state.alerts];
      const unreadCount = alerts.filter((a) => !a.acknowledged).length;
      return { alerts, unreadCount };
    }),

  removeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.filter((a) => a.id !== id);
      const unreadCount = alerts.filter((a) => !a.acknowledged).length;
      return { alerts, unreadCount };
    }),

  acknowledgeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      );
      const unreadCount = alerts.filter((a) => !a.acknowledged).length;
      return { alerts, unreadCount };
    }),

  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),

  clearAcknowledged: () =>
    set((state) => {
      const alerts = state.alerts.filter((a) => !a.acknowledged);
      return { alerts, unreadCount: alerts.length };
    }),
}));
