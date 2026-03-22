import { Workflow, WorkflowStatus } from '@/lib/types/workflow.types';
import { WorkflowPattern, Prediction } from '@/lib/types/intelligence.types';

interface WorkflowHistory {
  workflowId: string;
  runs: WorkflowRun[];
}

interface WorkflowRun {
  status: WorkflowStatus;
  duration: number;
  pauseCount: number;
  failureReason?: string;
  timestamp: Date;
}

export class PatternDetector {
  private history: Map<string, WorkflowHistory> = new Map();
  private readonly minRunsForPattern = 3;

  /**
   * Record a workflow run
   */
  recordRun(workflow: Workflow) {
    const history = this.history.get(workflow.id) || {
      workflowId: workflow.id,
      runs: [],
    };

    const duration = workflow.endTime && workflow.startTime
      ? new Date(workflow.endTime).getTime() - new Date(workflow.startTime).getTime()
      : 0;

    history.runs.push({
      status: workflow.status,
      duration,
      pauseCount: 0, // Would need to track this separately
      failureReason: workflow.metadata?.error,
      timestamp: new Date(),
    });

    // Keep last 50 runs
    if (history.runs.length > 50) {
      history.runs.shift();
    }

    this.history.set(workflow.id, history);
  }

  /**
   * Detect patterns for a workflow
   */
  detectPatterns(workflowId: string): WorkflowPattern | null {
    const history = this.history.get(workflowId);
    if (!history || history.runs.length < this.minRunsForPattern) {
      return null;
    }

    const runs = history.runs;
    const recentRuns = runs.slice(-10); // Last 10 runs

    // Calculate statistics
    const totalRuns = runs.length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const failureRate = failedRuns / totalRuns;
    const averageDuration = runs.reduce((sum, r) => sum + r.duration, 0) / totalRuns;
    const pauseCount = runs.reduce((sum, r) => sum + r.pauseCount, 0);

    // Detect patterns
    const patterns = {
      frequentPauses: this.detectFrequentPauses(runs),
      highFailureRate: failureRate > 0.3, // >30% failure rate
      longRunningSteps: this.detectLongRunningSteps(runs),
      resourceBottlenecks: this.detectResourceBottlenecks(runs),
      repeatedErrors: this.detectRepeatedErrors(runs),
    };

    return {
      workflowId,
      detectedAt: new Date(),
      patterns,
      statistics: {
        totalRuns,
        failureRate,
        averageDuration,
        pauseCount,
      },
    };
  }

  /**
   * Generate predictions for a workflow
   */
  predict(workflowId: string): Prediction | null {
    const pattern = this.detectPatterns(workflowId);
    if (!pattern) return null;

    const { patterns, statistics } = pattern;

    // Calculate failure probability
    let likelyToFail = statistics.failureRate;
    
    // Adjust based on patterns
    if (patterns.highFailureRate) likelyToFail += 0.2;
    if (patterns.resourceBottlenecks) likelyToFail += 0.15;
    if (patterns.repeatedErrors.length > 0) likelyToFail += 0.1;

    likelyToFail = Math.min(likelyToFail, 1.0);

    // Estimate duration
    const estimatedDuration = statistics.averageDuration;

    // Calculate confidence
    const confidence = Math.min(statistics.totalRuns / 10, 1.0);

    // Generate reasoning
    const reasoning: string[] = [];
    
    if (patterns.highFailureRate) {
      reasoning.push(`High failure rate: ${(statistics.failureRate * 100).toFixed(1)}%`);
    }
    
    if (patterns.frequentPauses) {
      reasoning.push('Workflow frequently paused');
    }
    
    if (patterns.longRunningSteps.length > 0) {
      reasoning.push(`Long-running steps: ${patterns.longRunningSteps.join(', ')}`);
    }
    
    if (patterns.resourceBottlenecks) {
      reasoning.push('Resource bottlenecks detected');
    }
    
    if (patterns.repeatedErrors.length > 0) {
      reasoning.push(`Repeated errors: ${patterns.repeatedErrors.slice(0, 2).join(', ')}`);
    }

    return {
      workflowId,
      likelyToFail,
      estimatedDuration,
      confidence,
      reasoning,
    };
  }

  /**
   * Detect frequent pauses
   */
  private detectFrequentPauses(runs: WorkflowRun[]): boolean {
    const recentRuns = runs.slice(-5);
    const pausedRuns = recentRuns.filter(r => r.pauseCount > 0).length;
    return pausedRuns >= 3; // 3 out of last 5 runs had pauses
  }

  /**
   * Detect long-running steps
   */
  private detectLongRunningSteps(runs: WorkflowRun[]): string[] {
    // This would require step-level data
    // For now, return empty array
    return [];
  }

  /**
   * Detect resource bottlenecks
   */
  private detectResourceBottlenecks(runs: WorkflowRun[]): boolean {
    // Check if duration is increasing over time
    if (runs.length < 5) return false;

    const recentRuns = runs.slice(-5);
    const olderRuns = runs.slice(-10, -5);

    if (olderRuns.length === 0) return false;

    const recentAvg = recentRuns.reduce((sum, r) => sum + r.duration, 0) / recentRuns.length;
    const olderAvg = olderRuns.reduce((sum, r) => sum + r.duration, 0) / olderRuns.length;

    // Duration increased by >50%
    return recentAvg > olderAvg * 1.5;
  }

  /**
   * Detect repeated errors
   */
  private detectRepeatedErrors(runs: WorkflowRun[]): string[] {
    const errorCounts = new Map<string, number>();

    runs.forEach(run => {
      if (run.failureReason) {
        const count = errorCounts.get(run.failureReason) || 0;
        errorCounts.set(run.failureReason, count + 1);
      }
    });

    // Return errors that occurred 2+ times
    return Array.from(errorCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([error, _]) => error);
  }

  /**
   * Clear history for a workflow
   */
  clearHistory(workflowId: string) {
    this.history.delete(workflowId);
  }

  /**
   * Get all workflow IDs with history
   */
  getTrackedWorkflows(): string[] {
    return Array.from(this.history.keys());
  }
}

// Singleton instance
export const patternDetector = new PatternDetector();
