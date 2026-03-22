// Debug utilities for testing and development

class DebugManager {
  private enabled = false;

  enable() {
    this.enabled = true;
    console.log('🐛 Debug mode enabled');
  }

  disable() {
    this.enabled = false;
    console.log('🐛 Debug mode disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  log(...args: any[]) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }

  // Simulate WebSocket disconnect
  simulateDisconnect(websocketClient: any, duration = 5000) {
    if (!this.enabled) {
      console.warn('Enable debug mode first: window.debug.enable()');
      return;
    }

    console.log('🔌 Simulating disconnect for', duration, 'ms');
    websocketClient.disconnect();

    setTimeout(() => {
      console.log('🔌 Reconnecting...');
      websocketClient.connect();
    }, duration);
  }

  // Simulate delayed events
  simulateDelayedEvent(callback: () => void, delay = 3000) {
    if (!this.enabled) {
      console.warn('Enable debug mode first: window.debug.enable()');
      return;
    }

    console.log('⏱️ Simulating delayed event:', delay, 'ms');
    setTimeout(() => {
      console.log('⏱️ Executing delayed event');
      callback();
    }, delay);
  }

  // Log query cache state
  logQueryCache(queryClient: any) {
    if (!this.enabled) {
      console.warn('Enable debug mode first: window.debug.enable()');
      return;
    }

    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    console.group('📦 Query Cache State');
    queries.forEach((query: any) => {
      console.log({
        queryKey: query.queryKey,
        state: query.state.status,
        dataUpdatedAt: new Date(query.state.dataUpdatedAt),
        data: query.state.data,
      });
    });
    console.groupEnd();
  }

  // Log Zustand store state
  logStoreState(store: any) {
    if (!this.enabled) {
      console.warn('Enable debug mode first: window.debug.enable()');
      return;
    }

    console.group('🏪 Store State');
    console.log(store.getState());
    console.groupEnd();
  }

  // Measure render performance
  measureRender(componentName: string, callback: () => void) {
    if (!this.enabled) {
      callback();
      return;
    }

    const start = performance.now();
    callback();
    const end = performance.now();

    console.log(`⚡ ${componentName} render time:`, (end - start).toFixed(2), 'ms');
  }
}

export const debug = new DebugManager();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).debug = debug;
}
