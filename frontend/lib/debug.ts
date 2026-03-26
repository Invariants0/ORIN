/**
 * Debug utilities for testing and development.
 * Automatically respects the deployment environment.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class DebugManager {
  private enabled = !IS_PRODUCTION;

  /**
   * Manually enable debug mode via console: `window.debug.enable()`
   */
  enable() {
    this.enabled = true;
    console.log('🐛 [DEBUG] mode manually enabled');
  }

  /**
   * Manually disable debug mode.
   */
  disable() {
    this.enabled = false;
    console.log('🐛 [DEBUG] mode manually disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Performance-conscious logging that only executes when debug is enabled.
   */
  log(...args: any[]) {
    if (this.enabled) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Measure the execution time of a specific block.
   */
  measure(label: string, callback: () => void) {
    if (!this.enabled) {
      callback();
      return;
    }
    console.time(`⚡ [PERF] ${label}`);
    callback();
    console.timeEnd(`⚡ [PERF] ${label}`);
  }

  /**
   * Monitor the Query Cache state for React-Query.
   */
  logQueryCache(queryClient: any) {
    if (!this.enabled) return;
    const queries = queryClient.getQueryCache().getAll();
    console.group('📦 [DEBUG] Query Cache State');
    queries.forEach((q: any) => {
      console.log({
        key: q.queryKey,
        status: q.state.status,
        updated: new Date(q.state.dataUpdatedAt).toLocaleTimeString(),
        data: q.state.data,
      });
    });
    console.groupEnd();
  }

  /**
   * Monitor external store states (Zustand).
   */
  logStore(name: string, store: any) {
    if (!this.enabled) return;
    console.log(`🏪 [DEBUG] Store [${name}]:`, store.getState());
  }
}

export const debug = new DebugManager();

if (typeof window !== 'undefined' && !IS_PRODUCTION) {
  (window as any).debug = debug;
}
