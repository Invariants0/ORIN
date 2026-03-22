import { Suggestion, WorkflowPattern, Prediction } from '@/lib/types/intelligence.types';
import { Workflow } from '@/lib/types/workflow.types';

export class SuggestionEngine {
  private dismissedSuggestions = new Set<string>();

  /**
   * Generate suggestions based on patterns and predictions
   */
  generateSuggestions(
    workflow: Workflow,
    pattern: WorkflowPattern | null,
    prediction: Prediction | null
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (!pattern || !prediction) {
      return suggestions;
    }

    // High failure rate suggestion
    if (pattern.patterns.highFailureRate) {
      suggestions.push({
        id: `${workflow.id}-high-failure`,
        type: 'warning',
        message: `This workflow has a ${(pattern.statistics.failureRate * 100).toFixed(0)}% failure rate. Consider reviewing the configuration or input data.`,
        confidence: 0.9,
        action: {
          label: 'View Logs',
          handler: () => {
            // Navigate to logs
            console.log('Navigate to logs');
          },
        },
        dismissible: true,
        priority: 4,
      });
    }

    // Frequent pauses suggestion
    if (pattern.patterns.frequentPauses) {
      suggestions.push({
        id: `${workflow.id}-frequent-pauses`,
        type: 'optimization',
        message: 'This workflow is frequently paused. Consider automating the decision points or reviewing the workflow logic.',
        confidence: 0.8,
        dismissible: true,
        priority: 3,
      });
    }

    // Long-running steps suggestion
    if (pattern.patterns.longRunningSteps.length > 0) {
      suggestions.push({
        id: `${workflow.id}-long-steps`,
        type: 'optimization',
        message: `Steps ${pattern.patterns.longRunningSteps.join(', ')} are taking longer than usual. Consider optimizing or parallelizing these steps.`,
        confidence: 0.85,
        dismissible: true,
        priority: 3,
      });
    }

    // Resource bottleneck suggestion
    if (pattern.patterns.resourceBottlenecks) {
      suggestions.push({
        id: `${workflow.id}-bottleneck`,
        type: 'warning',
        message: 'Execution time is increasing. This may indicate resource constraints or data growth issues.',
        confidence: 0.75,
        dismissible: true,
        priority: 4,
      });
    }

    // Repeated errors suggestion
    if (pattern.patterns.repeatedErrors.length > 0) {
      const errorList = pattern.patterns.repeatedErrors.slice(0, 2).join(', ');
      suggestions.push({
        id: `${workflow.id}-repeated-errors`,
        type: 'action',
        message: `Repeated errors detected: ${errorList}. Would you like to retry with different parameters?`,
        confidence: 0.9,
        action: {
          label: 'Configure Retry',
          handler: () => {
            console.log('Open retry configuration');
          },
        },
        dismissible: true,
        priority: 5,
      });
    }

    // High failure prediction
    if (prediction.likelyToFail > 0.7) {
      suggestions.push({
        id: `${workflow.id}-likely-fail`,
        type: 'warning',
        message: `This workflow has a ${(prediction.likelyToFail * 100).toFixed(0)}% chance of failure. Consider reviewing before running.`,
        confidence: prediction.confidence,
        dismissible: true,
        priority: 5,
      });
    }

    // Filter dismissed suggestions
    return suggestions
      .filter(s => !this.dismissedSuggestions.has(s.id))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate system-level suggestions
   */
  generateSystemSuggestions(
    activeWorkflows: number,
    queueSize: number,
    failureRate: number
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // High system load
    if (activeWorkflows > 10) {
      suggestions.push({
        id: 'system-high-load',
        type: 'warning',
        message: `System is running ${activeWorkflows} workflows. Consider pausing non-critical workflows to improve performance.`,
        confidence: 0.8,
        dismissible: true,
        priority: 4,
      });
    }

    // Large queue
    if (queueSize > 20) {
      suggestions.push({
        id: 'system-large-queue',
        type: 'optimization',
        message: `${queueSize} workflows are queued. Consider scaling up resources or prioritizing critical workflows.`,
        confidence: 0.85,
        dismissible: true,
        priority: 3,
      });
    }

    // High system failure rate
    if (failureRate > 0.5) {
      suggestions.push({
        id: 'system-high-failures',
        type: 'action',
        message: `System failure rate is ${(failureRate * 100).toFixed(0)}%. This may indicate a systemic issue that needs attention.`,
        confidence: 0.9,
        action: {
          label: 'View System Health',
          handler: () => {
            console.log('Navigate to system health');
          },
        },
        dismissible: false,
        priority: 5,
      });
    }

    return suggestions
      .filter(s => !this.dismissedSuggestions.has(s.id))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string) {
    this.dismissedSuggestions.add(suggestionId);
  }

  /**
   * Clear dismissed suggestions
   */
  clearDismissed() {
    this.dismissedSuggestions.clear();
  }

  /**
   * Generate automation suggestions based on user behavior
   */
  generateAutomationSuggestions(
    frequentActions: string[],
    frequentWorkflows: string[]
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Frequent workflow sequence
    if (frequentWorkflows.length >= 3) {
      suggestions.push({
        id: 'automation-workflow-sequence',
        type: 'automation',
        message: `You frequently run workflows ${frequentWorkflows.slice(0, 3).join(' → ')}. Create an automated sequence?`,
        confidence: 0.8,
        action: {
          label: 'Create Automation',
          handler: () => {
            console.log('Open automation builder');
          },
        },
        dismissible: true,
        priority: 3,
      });
    }

    // Frequent retry action
    if (frequentActions.includes('retry')) {
      suggestions.push({
        id: 'automation-auto-retry',
        type: 'automation',
        message: 'You frequently retry failed workflows. Enable automatic retry with exponential backoff?',
        confidence: 0.85,
        action: {
          label: 'Enable Auto-Retry',
          handler: () => {
            console.log('Enable auto-retry');
          },
        },
        dismissible: true,
        priority: 4,
      });
    }

    return suggestions
      .filter(s => !this.dismissedSuggestions.has(s.id))
      .sort((a, b) => b.priority - a.priority);
  }
}

// Singleton instance
export const suggestionEngine = new SuggestionEngine();
