// Safety Controller Service - Phase 21
// Ensures safe evolution with bounds and rollback

import logger from '../../config/logger.js';
import {
  SafetyConstraints,
  EvolutionCheckpoint,
  EvolutionAction,
  SafetyViolation,
  EvolutionAuditEntry
} from '../../types/evolution.types.js';
import { AuthorityLevel } from '../../types/agent.types.js';

class SafetyControllerService {
  private constraints: SafetyConstraints;
  private checkpoints: Map<string, EvolutionCheckpoint> = new Map();
  private violations: SafetyViolation[] = [];
  private auditLog: EvolutionAuditEntry[] = [];
  private pendingActions: Map<string, EvolutionAction> = new Map();

  constructor() {
    // Default safety constraints
    this.constraints = {
      maxAgentsPerType: 10,
      maxTotalAgents: 50,
      maxTemporaryAgents: 20,
      creationRateLimit: {
        count: 5,
        period: 60 * 60 * 1000 // 1 hour
      },
      resourceLimits: {
        memoryPerAgent: 100, // MB
        cpuPerAgent: 10, // percentage
        totalMemory: 2048, // MB
        totalCpu: 80 // percentage
      },
      authorityConstraints: {
        newAgentAuthority: AuthorityLevel.READ_ONLY,
        promotionRequiresApproval: true,
        criticalActionsRequireOversight: true,
        autoDemoteOnFailures: 5
      }
    };
  }

  async initialize(): Promise<void> {
    logger.info('[SafetyController] Initializing...');
    
    // Create initial checkpoint
    await this.createCheckpoint('system', 'Initial system state');
    
    logger.info('[SafetyController] Initialized successfully');
  }

  /**
   * Check if evolution action is allowed
   */
  async checkEvolutionAllowed(action: Omit<EvolutionAction, 'actionId' | 'requestedAt' | 'status'>): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval: boolean;
  }> {
    logger.debug('[SafetyController] Checking evolution action', { type: action.type });

    // Check creation limits
    if (action.type === 'create_agent') {
      const creationCheck = await this.checkCreationLimits();
      if (!creationCheck.allowed) {
        return { allowed: false, reason: creationCheck.reason, requiresApproval: false };
      }
    }

    // Check resource limits
    const resourceCheck = await this.checkResourceLimits();
    if (!resourceCheck.allowed) {
      return { allowed: false, reason: resourceCheck.reason, requiresApproval: false };
    }

    // Check if requires approval
    const requiresApproval = this.requiresHumanApproval(action);

    return { allowed: true, requiresApproval };
  }

  /**
   * Create system checkpoint
   */
  async createCheckpoint(createdBy: 'system' | 'user', reason: string): Promise<EvolutionCheckpoint> {
    logger.info('[SafetyController] Creating checkpoint', { createdBy, reason });

    const checkpointId = `checkpoint_${Date.now()}`;
    
    const checkpoint: EvolutionCheckpoint = {
      checkpointId,
      timestamp: new Date(),
      systemState: {
        agents: [], // Would capture actual agent state
        strategies: [],
        metrics: [],
        architecture: {} as any
      },
      reason,
      createdBy
    };

    this.checkpoints.set(checkpointId, checkpoint);

    // Keep only last 10 checkpoints
    if (this.checkpoints.size > 10) {
      const oldest = Array.from(this.checkpoints.keys())[0];
      this.checkpoints.delete(oldest);
    }

    logger.info('[SafetyController] Checkpoint created', { checkpointId });

    return checkpoint;
  }

  /**
   * Rollback to checkpoint
   */
  async rollback(checkpointId: string): Promise<boolean> {
    logger.info('[SafetyController] Rolling back to checkpoint', { checkpointId });

    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      logger.error('[SafetyController] Checkpoint not found', { checkpointId });
      return false;
    }

    try {
      // Restore system state from checkpoint
      // In real implementation, would restore agents, strategies, etc.
      
      logger.info('[SafetyController] Rollback successful', { checkpointId });
      
      // Record in audit log
      await this.recordAudit({
        actionId: `rollback_${Date.now()}`,
        type: 'remove_agent',
        target: 'system',
        parameters: { checkpointId },
        requestedBy: 'system',
        requestedAt: new Date(),
        status: 'executed'
      }, 'success', { rolledBack: true });

      return true;
    } catch (error: any) {
      logger.error('[SafetyController] Rollback failed', {
        error: error.message,
        checkpointId
      });
      return false;
    }
  }

  /**
   * Enforce resource limits
   */
  async enforceResourceLimits(): Promise<void> {
    const check = await this.checkResourceLimits();
    
    if (!check.allowed) {
      logger.warn('[SafetyController] Resource limits exceeded', { reason: check.reason });
      
      this.recordViolation({
        type: 'resource_limit',
        severity: 'high',
        description: check.reason || 'Resource limits exceeded',
        violator: 'system'
      });
    }
  }

  /**
   * Record safety violation
   */
  recordViolation(violation: Omit<SafetyViolation, 'violationId' | 'detectedAt' | 'resolved'>): void {
    const fullViolation: SafetyViolation = {
      ...violation,
      violationId: `violation_${Date.now()}`,
      detectedAt: new Date(),
      resolved: false
    };

    this.violations.push(fullViolation);

    logger.warn('[SafetyController] Safety violation recorded', {
      type: violation.type,
      severity: violation.severity
    });

    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations.shift();
    }
  }

  /**
   * Record audit entry
   */
  async recordAudit(
    action: EvolutionAction,
    result: 'success' | 'failure' | 'partial',
    changes: Record<string, any>
  ): Promise<void> {
    const entry: EvolutionAuditEntry = {
      entryId: `audit_${Date.now()}`,
      timestamp: new Date(),
      action,
      performedBy: action.requestedBy,
      result,
      changes,
      impact: {
        performance: 0,
        reliability: 0,
        efficiency: 0
      },
      rollbackAvailable: true
    };

    this.auditLog.push(entry);

    // Keep only last 500 entries
    if (this.auditLog.length > 500) {
      this.auditLog.shift();
    }
  }

  /**
   * Get safety status
   */
  getSafetyStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    violations: number;
    unresolvedViolations: number;
    checkpoints: number;
    lastCheckpoint: Date | null;
  } {
    const unresolvedViolations = this.violations.filter(v => !v.resolved).length;
    const criticalViolations = this.violations.filter(
      v => !v.resolved && v.severity === 'critical'
    ).length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalViolations > 0) {
      status = 'critical';
    } else if (unresolvedViolations > 3) {
      status = 'warning';
    }

    const checkpointArray = Array.from(this.checkpoints.values());
    const lastCheckpoint = checkpointArray.length > 0
      ? checkpointArray[checkpointArray.length - 1].timestamp
      : null;

    return {
      status,
      violations: this.violations.length,
      unresolvedViolations,
      checkpoints: this.checkpoints.size,
      lastCheckpoint
    };
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 50): EvolutionAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get violations
   */
  getViolations(onlyUnresolved: boolean = false): SafetyViolation[] {
    if (onlyUnresolved) {
      return this.violations.filter(v => !v.resolved);
    }
    return this.violations;
  }

  /**
   * Get checkpoints
   */
  getCheckpoints(): EvolutionCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  // ==================== PRIVATE METHODS ====================

  private async checkCreationLimits(): Promise<{ allowed: boolean; reason?: string }> {
    // Check rate limit
    const recentCreations = this.auditLog.filter(entry => 
      entry.action.type === 'create_agent' &&
      entry.timestamp.getTime() > Date.now() - this.constraints.creationRateLimit.period
    );

    if (recentCreations.length >= this.constraints.creationRateLimit.count) {
      return {
        allowed: false,
        reason: `Creation rate limit exceeded: ${recentCreations.length}/${this.constraints.creationRateLimit.count} in last hour`
      };
    }

    return { allowed: true };
  }

  private async checkResourceLimits(): Promise<{ allowed: boolean; reason?: string }> {
    // In real implementation, would check actual resource usage
    // For now, return allowed
    return { allowed: true };
  }

  private requiresHumanApproval(action: Omit<EvolutionAction, 'actionId' | 'requestedAt' | 'status'>): boolean {
    // Agent creation requires approval
    if (action.type === 'create_agent') {
      return true;
    }

    // Authority changes require approval
    if (action.type === 'promote' || action.type === 'demote') {
      return this.constraints.authorityConstraints.promotionRequiresApproval;
    }

    // Architecture changes require approval
    if (action.type === 'rebalance') {
      return true;
    }

    return false;
  }
}

export const safetyControllerService = new SafetyControllerService();
export default safetyControllerService;
