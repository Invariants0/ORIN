import { useRef, useCallback } from 'react';
import { QueuedEvent, VersionState } from '@/lib/types/intelligence.types';

interface EventOrderingConfig {
  maxQueueSize?: number;
  maxRetries?: number;
  gapTimeout?: number; // ms to wait for missing versions
}

interface OrderableEvent {
  workflowId: string;
  [key: string]: unknown;
}

export function useEventOrdering(config: EventOrderingConfig = {}) {
  const {
    maxQueueSize = 1000,
    gapTimeout = 5000,
  } = config;

  // Track last processed version per workflow
  const versionState = useRef<Record<string, VersionState>>({});
  
  // Queue for out-of-order events
  const eventQueue = useRef<Record<string, QueuedEvent[]>>({});
  
  // Gap detection timers
  const gapTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Initialize version state for a workflow
  const initializeWorkflow = useCallback((workflowId: string) => {
    if (!versionState.current[workflowId]) {
      versionState.current[workflowId] = {
        workflowId,
        lastProcessedVersion: 0,
        pendingVersions: [],
        hasGaps: false,
      };
      eventQueue.current[workflowId] = [];
    }
  }, []);

  // Check if event should be processed immediately
  const shouldProcessImmediately = useCallback((
    workflowId: string,
    version: number
  ): boolean => {
    const state = versionState.current[workflowId];
    if (!state) return true; // First event

    // Process if it's the next expected version
    return version === state.lastProcessedVersion + 1;
  }, []);

  // Internal processing function
  const processEventInternal = useCallback((
    event: OrderableEvent,
    version: number,
    forced: boolean
  ) => {
    const workflowId = event.workflowId;
    const state = versionState.current[workflowId];

    if (!state) return;

    // Update version
    state.lastProcessedVersion = Math.max(state.lastProcessedVersion, version);

    // Log if forced (gap timeout)
    if (forced) {
      console.warn(
        `Forced processing of event v${version} for workflow ${workflowId}`
      );
    }

    // Event will be processed by the caller
  }, []);

  // Handle gap timeout - process queued events anyway
  const handleGapTimeout = useCallback((workflowId: string) => {
    const queue = eventQueue.current[workflowId];
    if (!queue || queue.length === 0) return;

    console.warn(
      `Version gap timeout for workflow ${workflowId}. Processing queued events.`
    );

    // Process all queued events in order
    queue.forEach(queuedEvent => {
      processEventInternal(queuedEvent.event as OrderableEvent, queuedEvent.version, true);
    });

    // Clear queue
    eventQueue.current[workflowId] = [];
    
    const state = versionState.current[workflowId];
    if (state) {
      state.hasGaps = false;
      state.pendingVersions = [];
    }
  }, [processEventInternal]);

  // Queue event for later processing
  const queueEvent = useCallback((
    workflowId: string,
    event: OrderableEvent,
    version: number
  ) => {
    const queue = eventQueue.current[workflowId] || [];
    
    // Check if already queued
    if (queue.some(e => e.version === version)) {
      return;
    }

    // Add to queue
    queue.push({
      event,
      version,
      timestamp: Date.now(),
      retryCount: 0,
      workflowId,
    });

    // Sort by version
    queue.sort((a, b) => a.version - b.version);

    // Limit queue size
    if (queue.length > maxQueueSize) {
      queue.shift();
    }

    eventQueue.current[workflowId] = queue;

    // Mark as having gaps
    const state = versionState.current[workflowId];
    if (state) {
      state.hasGaps = true;
      state.pendingVersions = queue.map(e => e.version);
    }

    // Set gap timeout
    if (gapTimers.current[workflowId]) {
      clearTimeout(gapTimers.current[workflowId]);
    }

    gapTimers.current[workflowId] = setTimeout(() => {
      handleGapTimeout(workflowId);
    }, gapTimeout);
  }, [gapTimeout, handleGapTimeout, maxQueueSize]);

  // Process queued events that can now be processed
  const processQueuedEvents = useCallback((workflowId: string) => {
    const queue = eventQueue.current[workflowId];
    if (!queue || queue.length === 0) return;

    const state = versionState.current[workflowId];
    if (!state) return;

    let processed = 0;
    const remaining: QueuedEvent[] = [];

    for (const queuedEvent of queue) {
      if (queuedEvent.version === state.lastProcessedVersion + 1) {
        // Process this event
        processEventInternal(queuedEvent.event as OrderableEvent, queuedEvent.version, false);
        processed++;
      } else {
        // Keep in queue
        remaining.push(queuedEvent);
      }
    }

    eventQueue.current[workflowId] = remaining;

    // Update gap status
    if (remaining.length === 0) {
      state.hasGaps = false;
      state.pendingVersions = [];
      
      // Clear gap timer
      if (gapTimers.current[workflowId]) {
        clearTimeout(gapTimers.current[workflowId]);
        delete gapTimers.current[workflowId];
      }
    } else {
      state.pendingVersions = remaining.map(e => e.version);
    }

    if (processed > 0) {
      console.log(`Processed ${processed} queued events for workflow ${workflowId}`);
    }
  }, [processEventInternal]);

  // Main event processing function
  const processEvent = useCallback((
    event: OrderableEvent,
    version?: number,
    processor?: (event: OrderableEvent) => void
  ): boolean => {
    const workflowId = event.workflowId;
    if (!workflowId) {
      console.warn('Event missing workflowId', event);
      return false;
    }

    // Initialize if needed
    initializeWorkflow(workflowId);

    // If no version, process immediately
    if (version === undefined) {
      processor?.(event);
      return true;
    }

    // Check if should process immediately
    if (shouldProcessImmediately(workflowId, version)) {
      // Process event
      processor?.(event);
      
      // Update version
      const state = versionState.current[workflowId];
      if (state) {
        state.lastProcessedVersion = version;
      }

      // Try to process queued events
      processQueuedEvents(workflowId);

      return true;
    }

    // Check if it's an old event
    const state = versionState.current[workflowId];
    if (state && version <= state.lastProcessedVersion) {
      console.log(
        `Ignoring old event v${version} for workflow ${workflowId} (current: v${state.lastProcessedVersion})`
      );
      return false;
    }

    // Queue for later
    queueEvent(workflowId, event, version);
    const expectedVersion = state ? state.lastProcessedVersion + 1 : 1;
    console.log(
      `Queued event v${version} for workflow ${workflowId} (expected: v${expectedVersion})`
    );

    return false;
  }, [initializeWorkflow, shouldProcessImmediately, queueEvent, processQueuedEvents]);

  // Get version state for a workflow
  const getVersionState = useCallback((workflowId: string): VersionState | null => {
    return versionState.current[workflowId] || null;
  }, []);

  // Get queued events for a workflow
  const getQueuedEvents = useCallback((workflowId: string): QueuedEvent[] => {
    return eventQueue.current[workflowId] || [];
  }, []);

  // Clear queue for a workflow
  const clearQueue = useCallback((workflowId: string) => {
    eventQueue.current[workflowId] = [];
    
    const state = versionState.current[workflowId];
    if (state) {
      state.hasGaps = false;
      state.pendingVersions = [];
    }

    if (gapTimers.current[workflowId]) {
      clearTimeout(gapTimers.current[workflowId]);
      delete gapTimers.current[workflowId];
    }
  }, []);

  // Get statistics
  const getStatistics = useCallback(() => {
    const workflows = Object.keys(versionState.current);
    const totalQueued = workflows.reduce(
      (sum, id) => sum + (eventQueue.current[id]?.length || 0),
      0
    );
    const workflowsWithGaps = workflows.filter(
      id => versionState.current[id]?.hasGaps
    ).length;

    return {
      totalWorkflows: workflows.length,
      totalQueuedEvents: totalQueued,
      workflowsWithGaps,
      averageQueueSize: workflows.length > 0 ? totalQueued / workflows.length : 0,
    };
  }, []);

  return {
    processEvent,
    getVersionState,
    getQueuedEvents,
    clearQueue,
    getStatistics,
  };
}
