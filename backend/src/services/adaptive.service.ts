import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';
import promptEngineService from './prompt-engine.service.js';
import { TaskItem } from './task.service.js';

const prisma = new PrismaClient();

export interface TaskMetricsData {
  taskId: string;
  estimatedTime?: string;
  actualTime?: number;
  success: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AdaptiveLearning {
  averageActualTime: number;
  successRate: number;
  commonDelays: string[];
  recommendations: string[];
}

export interface PriorityAdjustment {
  taskId: string;
  originalPriority: string;
  adjustedPriority: string;
  reason: string;
}

class AdaptiveService {
  /**
   * Track task execution start
   */
  async trackTaskStart(taskId: string, estimatedTime?: string): Promise<void> {
    try {
      logger.info('[Adaptive] Tracking task start', { taskId, estimatedTime });

      await prisma.taskMetrics.create({
        data: {
          taskId,
          estimatedTime,
          startedAt: new Date(),
          success: true
        }
      });

      logger.debug('[Adaptive] Task start tracked', { taskId });

    } catch (error: any) {
      logger.error('[Adaptive] Failed to track task start', {
        error: error.message,
        taskId
      });
      // Don't throw - metrics tracking shouldn't break execution
    }
  }

  /**
   * Track task completion
   */
  async trackTaskCompletion(
    taskId: string,
    success: boolean = true
  ): Promise<void> {
    try {
      logger.info('[Adaptive] Tracking task completion', { taskId, success });

      const metrics = await prisma.taskMetrics.findUnique({
        where: { taskId }
      });

      if (!metrics) {
        logger.warn('[Adaptive] No metrics found for task', { taskId });
        return;
      }

      const completedAt = new Date();
      const actualTime = metrics.startedAt
        ? Math.round((completedAt.getTime() - metrics.startedAt.getTime()) / 60000) // minutes
        : null;

      await prisma.taskMetrics.update({
        where: { taskId },
        data: {
          completedAt,
          actualTime,
          success
        }
      });

      logger.info('[Adaptive] Task completion tracked', {
        taskId,
        actualTime: actualTime ? `${actualTime} minutes` : 'unknown',
        success
      });

    } catch (error: any) {
      logger.error('[Adaptive] Failed to track task completion', {
        error: error.message,
        taskId
      });
      // Don't throw - metrics tracking shouldn't break execution
    }
  }

  /**
   * Get learning insights from historical data
   */
  async getLearningInsights(userId: string): Promise<AdaptiveLearning> {
    try {
      logger.debug('[Adaptive] Getting learning insights', { userId });

      // Get all completed tasks with metrics for user
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: 'done'
        },
        include: {
          metrics: true
        }
      });

      const tasksWithMetrics = tasks.filter(t => t.metrics && t.metrics.actualTime);

      if (tasksWithMetrics.length === 0) {
        return {
          averageActualTime: 0,
          successRate: 100,
          commonDelays: [],
          recommendations: ['Complete more tasks to generate insights']
        };
      }

      // Calculate average actual time
      const totalTime = tasksWithMetrics.reduce(
        (sum, t) => sum + (t.metrics?.actualTime || 0),
        0
      );
      const averageActualTime = Math.round(totalTime / tasksWithMetrics.length);

      // Calculate success rate
      const successfulTasks = tasks.filter(t => t.metrics?.success !== false).length;
      const successRate = Math.round((successfulTasks / tasks.length) * 100);

      // Identify common delays (tasks that took longer than estimated)
      const commonDelays = this.identifyCommonDelays(tasksWithMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        averageActualTime,
        successRate,
        commonDelays
      );

      logger.debug('[Adaptive] Learning insights generated', {
        userId,
        tasksAnalyzed: tasksWithMetrics.length,
        averageActualTime,
        successRate
      });

      return {
        averageActualTime,
        successRate,
        commonDelays,
        recommendations
      };

    } catch (error: any) {
      logger.error('[Adaptive] Failed to get learning insights', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Identify common delay patterns
   */
  private identifyCommonDelays(tasks: any[]): string[] {
    const delays: string[] = [];

    // Check for tasks that took significantly longer than estimated
    const delayedTasks = tasks.filter(t => {
      if (!t.metrics?.estimatedTime || !t.metrics?.actualTime) return false;

      const estimated = this.parseEstimatedTime(t.metrics.estimatedTime);
      const actual = t.metrics.actualTime;

      return actual > estimated * 1.5; // 50% longer than estimated
    });

    if (delayedTasks.length > tasks.length * 0.3) {
      delays.push('Tasks often take longer than estimated');
    }

    // Check for specific task types that are delayed
    const taskTitles = delayedTasks.map(t => t.title.toLowerCase());
    const commonWords = this.findCommonWords(taskTitles);

    if (commonWords.length > 0) {
      delays.push(`Tasks involving "${commonWords[0]}" tend to take longer`);
    }

    return delays;
  }

  /**
   * Parse estimated time string to minutes
   */
  private parseEstimatedTime(estimatedTime: string): number {
    const lower = estimatedTime.toLowerCase();

    // Extract numbers
    const numbers = lower.match(/\d+/g);
    if (!numbers) return 60; // default 1 hour

    const num = parseInt(numbers[0]);

    // Check units
    if (lower.includes('minute')) {
      return num;
    } else if (lower.includes('hour')) {
      return num * 60;
    } else if (lower.includes('day')) {
      return num * 480; // 8 hour work day
    }

    return num * 60; // default to hours
  }

  /**
   * Find common words in task titles
   */
  private findCommonWords(titles: string[]): string[] {
    const wordCount = new Map<string, number>();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

    titles.forEach(title => {
      const words = title.split(/\s+/).filter(w => w.length > 3 && !commonWords.has(w));
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  /**
   * Generate recommendations based on insights
   */
  private generateRecommendations(
    averageTime: number,
    successRate: number,
    delays: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (averageTime > 180) {
      recommendations.push('Consider breaking down tasks into smaller subtasks (average task takes 3+ hours)');
    }

    if (successRate < 80) {
      recommendations.push('Review task requirements more carefully before starting (success rate below 80%)');
    }

    if (delays.length > 0) {
      recommendations.push('Add buffer time to estimates for complex tasks');
    }

    if (averageTime < 30) {
      recommendations.push('Tasks are quick - consider batching similar tasks together');
    }

    if (recommendations.length === 0) {
      recommendations.push('Task execution is efficient - keep up the good work!');
    }

    return recommendations;
  }

  /**
   * Adjust task priorities based on historical data
   */
  async adjustTaskPriorities(
    tasks: TaskItem[],
    userId: string
  ): Promise<{ tasks: TaskItem[]; adjustments: PriorityAdjustment[] }> {
    try {
      logger.info('[Adaptive] Adjusting task priorities', {
        userId,
        taskCount: tasks.length
      });

      const insights = await this.getLearningInsights(userId);
      const adjustments: PriorityAdjustment[] = [];

      // Get historical task data
      const historicalTasks = await prisma.task.findMany({
        where: { userId },
        include: { metrics: true }
      });

      const adjustedTasks = tasks.map((task, index) => {
        let adjustedPriority = task.priority;
        let reason = '';

        // Check if similar tasks were delayed
        const similarTasks = this.findSimilarTasks(task.title, historicalTasks);
        const delayedSimilar = similarTasks.filter(t => {
          if (!t.metrics?.estimatedTime || !t.metrics?.actualTime) return false;
          const estimated = this.parseEstimatedTime(t.metrics.estimatedTime);
          return t.metrics.actualTime > estimated * 1.5;
        });

        if (delayedSimilar.length > similarTasks.length * 0.5 && similarTasks.length >= 2) {
          // Similar tasks often delayed - increase priority
          if (adjustedPriority === 'low') {
            adjustedPriority = 'medium';
            reason = 'Similar tasks historically took longer than expected';
          } else if (adjustedPriority === 'medium') {
            adjustedPriority = 'high';
            reason = 'Similar tasks historically took longer than expected';
          }
        }

        // Check if quick tasks should be lowered
        const quickSimilar = similarTasks.filter(t => {
          return t.metrics?.actualTime && t.metrics.actualTime < 30;
        });

        if (quickSimilar.length > similarTasks.length * 0.7 && similarTasks.length >= 2) {
          // Similar tasks are quick - can lower priority
          if (adjustedPriority === 'high' && index > 2) {
            adjustedPriority = 'medium';
            reason = 'Similar tasks are typically quick to complete';
          }
        }

        if (adjustedPriority !== task.priority) {
          adjustments.push({
            taskId: `task-${index}`,
            originalPriority: task.priority,
            adjustedPriority,
            reason
          });
        }

        return {
          ...task,
          priority: adjustedPriority as 'high' | 'medium' | 'low'
        };
      });

      logger.info('[Adaptive] Task priorities adjusted', {
        userId,
        adjustmentCount: adjustments.length
      });

      return { tasks: adjustedTasks, adjustments };

    } catch (error: any) {
      logger.error('[Adaptive] Failed to adjust task priorities', {
        error: error.message,
        userId
      });
      // Return original tasks if adjustment fails
      return { tasks, adjustments: [] };
    }
  }

  /**
   * Find similar tasks based on title
   */
  private findSimilarTasks(title: string, historicalTasks: any[]): any[] {
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    return historicalTasks.filter(task => {
      const taskWords = task.title.toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter(w => taskWords.includes(w));
      return commonWords.length >= Math.min(2, titleWords.length * 0.5);
    });
  }

  /**
   * Generate better tasks using historical learning
   */
  async generateBetterTasks(
    goal: string,
    userId: string
  ): Promise<{
    suggestions: string[];
    improvements: string[];
  }> {
    try {
      logger.info('[Adaptive] Generating better tasks', { userId, goal });

      const insights = await this.getLearningInsights(userId);

      // Build context from historical data
      const historicalContext = `
Historical Performance:
- Average task completion time: ${insights.averageActualTime} minutes
- Success rate: ${insights.successRate}%
- Common delays: ${insights.commonDelays.join(', ') || 'None'}
- Recommendations: ${insights.recommendations.join(', ')}
`;

      const systemPrompt = `You are an adaptive task planning assistant. Use historical performance data to generate better task breakdowns.

Goal: "${goal}"

${historicalContext}

Your task:
1. Suggest improvements to task decomposition based on historical data
2. Recommend specific task breakdown strategies
3. Identify potential bottlenecks based on past patterns

Guidelines:
- If average completion time is high, suggest smaller tasks
- If success rate is low, suggest more detailed task descriptions
- If certain types of tasks are delayed, suggest breaking them down further
- Be specific and actionable`;

      const response = await promptEngineService.generateStructuredResponse<{
        suggestions: string[];
        improvements: string[];
      }>({
        systemPrompt,
        userInput: goal,
        schema: {
          suggestions: 'array',
          improvements: 'array'
        },
        temperature: 0.7
      });

      if (response.status !== 'success') {
        throw new Error('Failed to generate better tasks');
      }

      logger.info('[Adaptive] Better tasks generated', {
        userId,
        suggestionsCount: response.data.suggestions.length,
        improvementsCount: response.data.improvements.length
      });

      return response.data;

    } catch (error: any) {
      logger.error('[Adaptive] Failed to generate better tasks', {
        error: error.message,
        userId,
        goal
      });
      // Return empty suggestions if generation fails
      return {
        suggestions: [],
        improvements: []
      };
    }
  }

  /**
   * Get task metrics
   */
  async getTaskMetrics(taskId: string): Promise<TaskMetricsData | null> {
    try {
      const metrics = await prisma.taskMetrics.findUnique({
        where: { taskId }
      });

      if (!metrics) return null;

      return {
        taskId: metrics.taskId,
        estimatedTime: metrics.estimatedTime || undefined,
        actualTime: metrics.actualTime || undefined,
        success: metrics.success,
        startedAt: metrics.startedAt || undefined,
        completedAt: metrics.completedAt || undefined
      };

    } catch (error: any) {
      logger.error('[Adaptive] Failed to get task metrics', {
        error: error.message,
        taskId
      });
      return null;
    }
  }

  /**
   * Get all metrics for a user
   */
  async getUserMetrics(userId: string): Promise<TaskMetricsData[]> {
    try {
      const tasks = await prisma.task.findMany({
        where: { userId },
        include: { metrics: true }
      });

      return tasks
        .filter(t => t.metrics)
        .map(t => ({
          taskId: t.id,
          estimatedTime: t.metrics?.estimatedTime || undefined,
          actualTime: t.metrics?.actualTime || undefined,
          success: t.metrics?.success || false,
          startedAt: t.metrics?.startedAt || undefined,
          completedAt: t.metrics?.completedAt || undefined
        }));

    } catch (error: any) {
      logger.error('[Adaptive] Failed to get user metrics', {
        error: error.message,
        userId
      });
      return [];
    }
  }
}

export const adaptiveService = new AdaptiveService();
export default adaptiveService;
