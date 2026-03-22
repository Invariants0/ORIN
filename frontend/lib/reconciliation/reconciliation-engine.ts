import { Workflow } from '@/lib/types/workflow.types';
import { ReconciliationResult } from '@/lib/types/intelligence.types';

export type ConflictResolutionStrategy = 'server_wins' | 'client_wins' | 'merge' | 'manual';

interface ReconciliationConfig {
  strategy?: ConflictResolutionStrategy;
  ignoreFields?: string[];
  timestampField?: string;
}

export class ReconciliationEngine {
  private config: ReconciliationConfig;

  constructor(config: ReconciliationConfig = {}) {
    this.config = {
      strategy: 'server_wins',
      ignoreFields: ['_optimistic', '_optimisticQueue'],
      timestampField: 'updatedAt',
      ...config,
    };
  }

  /**
   * Reconcile two workflow states
   */
  reconcile(
    serverState: Workflow,
    clientState: Workflow,
    strategy?: ConflictResolutionStrategy
  ): ReconciliationResult {
    const resolvedStrategy = strategy || this.config.strategy || 'server_wins';
    const changes: ReconciliationResult['changes'] = [];
    let hadConflict = false;

    // Detect conflicts
    const conflicts = this.detectConflicts(serverState, clientState);

    if (conflicts.length > 0) {
      hadConflict = true;
      console.log(
        `Reconciling ${conflicts.length} conflicts for workflow ${serverState.id}`,
        conflicts
      );
    }

    // Resolve based on strategy
    let resolution: ReconciliationResult['resolution'];

    switch (resolvedStrategy) {
      case 'server_wins':
        resolution = 'server_wins';
        // Server state is already the source
        conflicts.forEach(field => {
          changes.push({
            field,
            oldValue: (clientState as any)[field],
            newValue: (serverState as any)[field],
          });
        });
        break;

      case 'client_wins':
        resolution = 'client_wins';
        // Keep client state
        conflicts.forEach(field => {
          changes.push({
            field,
            oldValue: (serverState as any)[field],
            newValue: (clientState as any)[field],
          });
        });
        break;

      case 'merge':
        resolution = 'merged';
        // Merge based on timestamps or other logic
        conflicts.forEach(field => {
          const merged = this.mergeField(
            field,
            (serverState as any)[field],
            (clientState as any)[field],
            serverState,
            clientState
          );
          changes.push({
            field,
            oldValue: (clientState as any)[field],
            newValue: merged,
          });
        });
        break;

      default:
        resolution = 'server_wins';
    }

    return {
      workflowId: serverState.id,
      timestamp: new Date(),
      hadConflict,
      resolution,
      changes,
    };
  }

  /**
   * Detect conflicts between two states
   */
  private detectConflicts(
    serverState: Workflow,
    clientState: Workflow
  ): string[] {
    const conflicts: string[] = [];
    const ignoreFields = this.config.ignoreFields || [];

    // Compare all fields
    Object.keys(serverState).forEach(key => {
      if (ignoreFields.includes(key)) return;

      const serverValue = (serverState as any)[key];
      const clientValue = (clientState as any)[key];

      if (!this.isEqual(serverValue, clientValue)) {
        conflicts.push(key);
      }
    });

    return conflicts;
  }

  /**
   * Merge a specific field
   */
  private mergeField(
    field: string,
    serverValue: any,
    clientValue: any,
    serverState: Workflow,
    clientState: Workflow
  ): any {
    // Use timestamp to determine which is newer
    const timestampField = this.config.timestampField || 'updatedAt';
    const serverTime = new Date((serverState as any)[timestampField]).getTime();
    const clientTime = new Date((clientState as any)[timestampField]).getTime();

    // Newer wins
    return serverTime >= clientTime ? serverValue : clientValue;
  }

  /**
   * Deep equality check
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.isEqual(item, b[index]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Check if workflow needs reconciliation
   */
  needsReconciliation(
    serverState: Workflow,
    clientState: Workflow
  ): boolean {
    const conflicts = this.detectConflicts(serverState, clientState);
    return conflicts.length > 0;
  }

  /**
   * Apply reconciliation result to client state
   */
  applyReconciliation(
    clientState: Workflow,
    result: ReconciliationResult
  ): Workflow {
    if (!result.hadConflict) {
      return clientState;
    }

    const updated = { ...clientState };

    result.changes.forEach(change => {
      (updated as any)[change.field] = change.newValue;
    });

    return updated;
  }
}

// Singleton instance
export const reconciliationEngine = new ReconciliationEngine();
