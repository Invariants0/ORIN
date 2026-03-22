import { create } from 'zustand';
import { TimelineEvent } from '@/lib/types/intelligence.types';

interface TimelineState {
  events: TimelineEvent[];
  maxEvents: number;
  filters: {
    workflowId?: string;
    type?: string;
    source?: TimelineEvent['source'];
    startDate?: Date;
    endDate?: Date;
  };

  // Actions
  addEvent: (event: TimelineEvent) => void;
  getEvents: (workflowId?: string) => TimelineEvent[];
  getEventsByType: (type: string) => TimelineEvent[];
  setFilters: (filters: TimelineState['filters']) => void;
  clearFilters: () => void;
  clearEvents: (workflowId?: string) => void;
  exportEvents: (workflowId?: string) => string;
  replay: (fromTimestamp: Date, workflowId?: string) => TimelineEvent[];
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  maxEvents: 1000,
  filters: {},

  addEvent: (event) =>
    set((state) => {
      const events = [...state.events, event];

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Limit size
      if (events.length > state.maxEvents) {
        events.splice(state.maxEvents);
      }

      return { events };
    }),

  getEvents: (workflowId) => {
    const { events, filters } = get();
    let filtered = events;

    // Apply workflow filter
    if (workflowId) {
      filtered = filtered.filter((e) => e.workflowId === workflowId);
    }

    // Apply other filters
    if (filters.workflowId) {
      filtered = filtered.filter((e) => e.workflowId === filters.workflowId);
    }

    if (filters.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }

    if (filters.source) {
      filtered = filtered.filter((e) => e.source === filters.source);
    }

    if (filters.startDate) {
      filtered = filtered.filter(
        (e) => e.timestamp >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (e) => e.timestamp <= filters.endDate!
      );
    }

    return filtered;
  },

  getEventsByType: (type) => {
    const { events } = get();
    return events.filter((e) => e.type === type);
  },

  setFilters: (filters) => set({ filters }),

  clearFilters: () => set({ filters: {} }),

  clearEvents: (workflowId) =>
    set((state) => {
      if (workflowId) {
        return {
          events: state.events.filter((e) => e.workflowId !== workflowId),
        };
      }
      return { events: [] };
    }),

  exportEvents: (workflowId) => {
    const events = get().getEvents(workflowId);
    return JSON.stringify(events, null, 2);
  },

  replay: (fromTimestamp, workflowId) => {
    const events = get().getEvents(workflowId);
    return events.filter((e) => e.timestamp >= fromTimestamp);
  },
}));
