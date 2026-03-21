import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { workflowRepository } from './workflow.repository';

interface WorkflowEvent {
  type: 'workflow_started' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused' | 
        'step_started' | 'step_completed' | 'step_failed' | 'step_timeout';
  workflowId: string;
  stepId?: string;
  timestamp: Date;
  data?: any;
}

interface WorkflowMetrics {
  workflowId: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  progress: number;
  executionTime: number;
  estimatedTimeRemaining: number;
  retryCount: number;
  status: string;
}

interface SystemMetrics {
  activeWorkflows: number;
  queuedWorkflows: number;
  completedToday: number;
  failedToday: number;
  averageExecutionTime: number;
  failureRate: number;
  queueSize: number;
  activeWorkers: number;
}

interface Alert {
  id: string;
  type: 'workflow_failed' | 'timeout_spike' | 'high_failure_rate' | 'queue_backlog';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  workflowId?: string;
  timestamp: Date;
  metadata?: any;
}

class MonitoringService extends EventEmitter {
  private metrics: Map<string, WorkflowMetrics> = new Map();
  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 100;
  private metricsInterval: NodeJS.Timeout | null = null;
  private alertsInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Support many WebSocket connections
  }

  /**
   * Start monitoring service
   */
  start() {
    logger.info('Starting monitoring service');

    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Check for alerts every 30 seconds
    this.alertsInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000);
  }

  /**
   * Stop monitoring service
   */
  stop() {
    logger.info('Stopping monitoring service');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
      this.alertsInterval = null;
    }
  }

  /**
   * Emit workflow event
   */
  emitWorkflowEvent(event: WorkflowEvent) {
    logger.debug('Workflow event', event);
    this.emit('workflow_event', event);

    // Update metrics
    this.updateMetrics(event);

    // Broadcast to all listeners (WebSocket clients)
    this.emit('broadcast', {
      type: 'workflow_event',
      event
    });
  }

  /**
   * Track workflow started
   */
  trackWorkflowStarted(workflowId: string, totalSteps: number) {
    const event: WorkflowEvent = {
      type: 'workflow_started',
      workflowId,
      timestamp: new Date(),
      data: { totalSteps }
    };

    this.emitWorkflowEvent(event);

    // Initialize metrics
    this.metrics.set(workflowId, {
      workflowId,
      totalSteps,
      completedSteps: 0,
      failedSteps: 0,
      progress: 0,
      executionTime: 0,
      estimatedTimeRemaining: 0,
      retryCount: 0,
      status: 'running'
    });
  }

  /**
   * Track step started
   */
  trackStepStarted(workflowId: string, stepId: string, stepName: string) {
    const event: WorkflowEvent = {
      type: 'step_started',
      workflowId,
      stepId,
      timestamp: new Date(),
      data: { stepName }
    };

    this.emitWorkflowEvent(event);
  }

  /**
   * Track step completed
   */
  trackStepCompleted(workflowId: string, stepId: string, duration: number, output?: any) {
    const event: WorkflowEvent = {
      type: 'step_completed',
      workflowId,
      stepId,
      timestamp: new Date(),
      data: { duration, output }
    };

    this.emitWorkflowEvent(event);

    // Update metrics
    const metrics = this.metrics.get(workflowId);
    if (metrics) {
      metrics.completedSteps++;
      metrics.progress = (metrics.completedSteps / metrics.totalSteps) * 100;
      this.metrics.set(workflowId, metrics);
    }
  }

  /**
   * Track step failed
   */
  trackStepFailed(workflowId: string, stepId: string, error: string, retryCount: number) {
    const event: WorkflowEvent = {
      type: 'step_failed',
      workflowId,
      stepId,
      timestamp: new Date(),
      data: { error, retryCount }
    };

    this.emitWorkflowEvent(event);

    // Update metrics
    const metrics = this.metrics.get(workflowId);
    if (metrics) {
      metrics.failedSteps++;
      metrics.retryCount = retryCount;
      this.metrics.set(workflowId, metrics);
    }

    // Create alert for failed step
    this.createAlert({
      type: 'workflow_failed',
      severity: retryCount > 2 ? 'high' : 'medium',
      message: `Step ${stepId} failed in workflow ${workflowId}: ${error}`,
      workflowId,
      metadata: { stepId, error, retryCount }
    });
  }

  /**
   * Track step timeout
   */
  trackStepTimeout(workflowId: string, stepId: string) {
    const event: WorkflowEvent = {
      type: 'step_timeout',
      workflowId,
      stepId,
      timestamp: new Date()
    };

    this.emitWorkflowEvent(event);

    // Create alert
    this.createAlert({
      type: 'timeout_spike',
      severity: 'high',
      message: `Step ${stepId} timed out in workflow ${workflowId}`,
      workflowId,
      metadata: { stepId }
    });
  }

  /**
   * Track workflow completed
   */
  trackWorkflowCompleted(workflowId: string, duration: number) {
    const event: WorkflowEvent = {
      type: 'workflow_completed',
      workflowId,
      timestamp: new Date(),
      data: { duration }
    };

    this.emitWorkflowEvent(event);

    // Update metrics
    const metrics = this.metrics.get(workflowId);
    if (metrics) {
      metrics.status = 'completed';
      metrics.executionTime = duration;
      metrics.progress = 100;
      this.metrics.set(workflowId, metrics);
    }
  }

  /**
   * Track workflow failed
   */
  trackWorkflowFailed(workflowId: string, reason: string) {
    const event: WorkflowEvent = {
      type: 'workflow_failed',
      workflowId,
      timestamp: new Date(),
      data: { reason }
    };

    this.emitWorkflowEvent(event);

    // Update metrics
    const metrics = this.metrics.get(workflowId);
    if (metrics) {
      metrics.status = 'failed';
      this.metrics.set(workflowId, metrics);
    }

    // Create alert
    this.createAlert({
      type: 'workflow_failed',
      severity: 'critical',
      message: `Workflow ${workflowId} failed: ${reason}`,
      workflowId,
      metadata: { reason }
    });
  }

  /**
   * Track workflow paused
   */
  trackWorkflowPaused(workflowId: string, reason: string) {
    const event: WorkflowEvent = {
      type: 'workflow_paused',
      workflowId,
      timestamp: new Date(),
      data: { reason }
    };

    this.emitWorkflowEvent(event);

    // Update metrics
    const metrics = this.metrics.get(workflowId);
    if (metrics) {
      metrics.status = 'paused';
      this.metrics.set(workflowId, metrics);
    }
  }

  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId: string): WorkflowMetrics | undefined {
    return this.metrics.get(workflowId);
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const stats = await workflowRepository.getStatistics();
    
    // Calculate today's stats
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      activeWorkflows: stats.running,
      queuedWorkflows: stats.pending,
      completedToday: stats.completed, // Would need date filtering in real implementation
      failedToday: stats.failed,
      averageExecutionTime: this.calculateAverageExecutionTime(),
      failureRate: this.calculateFailureRate(stats),
      queueSize: stats.pending,
      activeWorkers: this.getActiveWorkerCount()
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
    logger.info('Alerts cleared');
  }

  /**
   * Get all workflow metrics
   */
  getAllWorkflowMetrics(): WorkflowMetrics[] {
    return Array.from(this.metrics.values());
  }

  // ==================== PRIVATE METHODS ====================

  private updateMetrics(event: WorkflowEvent) {
    // Metrics are updated in specific tracking methods
    // This is a hook for additional metric processing
  }

  private async collectSystemMetrics() {
    try {
      const metrics = await this.getSystemMetrics();
      
      // Emit system metrics
      this.emit('broadcast', {
        type: 'system_metrics',
        metrics
      });

      logger.debug('System metrics collected', metrics);
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  private async checkAlerts() {
    try {
      const metrics = await this.getSystemMetrics();

      // Check for high failure rate
      if (metrics.failureRate > 0.2) { // 20% failure rate
        this.createAlert({
          type: 'high_failure_rate',
          severity: 'critical',
          message: `High failure rate detected: ${(metrics.failureRate * 100).toFixed(1)}%`,
          metadata: { failureRate: metrics.failureRate }
        });
      }

      // Check for queue backlog
      if (metrics.queueSize > 50) {
        this.createAlert({
          type: 'queue_backlog',
          severity: 'high',
          message: `Large queue backlog: ${metrics.queueSize} workflows pending`,
          metadata: { queueSize: metrics.queueSize }
        });
      }

      // Check for timeout spikes
      const recentTimeouts = this.countRecentTimeouts();
      if (recentTimeouts > 5) {
        this.createAlert({
          type: 'timeout_spike',
          severity: 'high',
          message: `Timeout spike detected: ${recentTimeouts} timeouts in last 5 minutes`,
          metadata: { timeoutCount: recentTimeouts }
        });
      }
    } catch (error) {
      logger.error('Failed to check alerts:', error);
    }
  }

  private createAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const newAlert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      ...alert
    };

    this.alerts.unshift(newAlert);

    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // Emit alert
    this.emit('broadcast', {
      type: 'alert',
      alert: newAlert
    });

    logger.warn('Alert created', newAlert);
  }

  private calculateAverageExecutionTime(): number {
    const completedMetrics = Array.from(this.metrics.values())
      .filter(m => m.status === 'completed' && m.executionTime > 0);

    if (completedMetrics.length === 0) return 0;

    const total = completedMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return total / completedMetrics.length;
  }

  private calculateFailureRate(stats: any): number {
    const total = stats.completed + stats.failed;
    if (total === 0) return 0;
    return stats.failed / total;
  }

  private getActiveWorkerCount(): number {
    // In a real implementation, this would track active workers
    // For now, return a placeholder
    return 1;
  }

  private countRecentTimeouts(): number {
    // Count timeout events in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.alerts.filter(
      a => a.type === 'timeout_spike' && a.timestamp > fiveMinutesAgo
    ).length;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const monitoringService = new MonitoringService();
