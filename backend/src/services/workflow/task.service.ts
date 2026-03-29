import db from '@/config/database.js';
import logger from '@/config/logger.js';
import promptEngineService from '@/services/ai/prompt-engine.service.js';
import adaptiveService from '@/services/ai/adaptive.service.js';

export interface DecomposeTaskInput {
  input: string;
  sessionId: string;
  userId: string;
}

export interface TaskItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TaskDecompositionResult {
  goal: string;
  tasks: TaskItem[];
  metadata: {
    sessionId: string;
    taskCount: number;
    processingTimeMs: number;
  };
}

export interface StoredTask {
  id: string;
  sessionId: string;
  userId: string;
  goal: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

class TaskService {
  /**
   * Decompose a goal into actionable tasks
   */
  async decomposeTask(input: DecomposeTaskInput, apiKey?: string): Promise<TaskDecompositionResult> {
    const startTime = Date.now();

    try {
      logger.info('[Task] Starting task decomposition', {
        userId: input.userId,
        sessionId: input.sessionId,
        inputLength: input.input.length
      });

      // Step 1: Get adaptive learning insights
      const betterTasks = await adaptiveService.generateBetterTasks(input.input, input.userId, apiKey);

      if (betterTasks.suggestions.length > 0) {
        logger.info('[Task] Adaptive suggestions available', {
          suggestionsCount: betterTasks.suggestions.length,
          improvementsCount: betterTasks.improvements.length
        });
      }

      // Step 2: Use Prompt Engine to decompose task
      const decomposition = await this.generateTaskDecomposition(input.input, betterTasks, apiKey);

      logger.info('[Task] Task decomposition generated', {
        goal: decomposition.goal,
        taskCount: decomposition.tasks.length
      });

      // Step 3: Adjust priorities based on historical data
      const adjusted = await adaptiveService.adjustTaskPriorities(
        decomposition.tasks,
        input.userId
      );

      if (adjusted.adjustments.length > 0) {
        logger.info('[Task] Priorities adjusted by adaptive layer', {
          adjustmentCount: adjusted.adjustments.length
        });
      }

      // Step 4: Store tasks in database
      await this.storeTasks({
        goal: decomposition.goal,
        tasks: adjusted.tasks,
        sessionId: input.sessionId,
        userId: input.userId
      });

      logger.info('[Task] Tasks stored in database', {
        sessionId: input.sessionId,
        taskCount: decomposition.tasks.length
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        goal: decomposition.goal,
        tasks: adjusted.tasks,
        metadata: {
          sessionId: input.sessionId,
          taskCount: adjusted.tasks.length,
          processingTimeMs
        }
      };

    } catch (error: any) {
      logger.error('[Task] Task decomposition failed', {
        error: error.message,
        userId: input.userId,
        sessionId: input.sessionId
      });
      throw error;
    }
  }

  /**
   * Generate task decomposition using Prompt Engine
   */
  private async generateTaskDecomposition(
    input: string,
    betterTasks?: { suggestions: string[]; improvements: string[] },
    apiKey?: string
  ): Promise<{
    goal: string;
    tasks: TaskItem[];
  }> {
    let adaptiveContext = '';
    
    if (betterTasks && betterTasks.suggestions.length > 0) {
      adaptiveContext = `

ADAPTIVE LEARNING INSIGHTS:
Based on historical task execution patterns, consider these improvements:

Suggestions:
${betterTasks.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Improvements:
${betterTasks.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

Apply these insights when breaking down the goal.`;
    }

    const systemPrompt = `You are a task decomposition expert. Break down the user's goal into clear, actionable tasks.

User Goal: "${input}"
${adaptiveContext}

Your task:
1. Identify the main goal
2. Break it down into 5-8 concrete, actionable tasks
3. Each task should be specific and measurable
4. Assign priority (high, medium, low) based on:
   - High: Critical, blocking, foundational
   - Medium: Important but not blocking
   - Low: Nice-to-have, polish, optimization

Guidelines:
- Tasks should be in logical order
- Each task should be completable independently
- Use clear, action-oriented language (start with verbs)
- Be specific about what needs to be done
- Include technical details where relevant

Example task structure:
{
  "title": "Create database schema",
  "description": "Design and implement Prisma schema with User, Session, and Task models. Add proper indexes and relations.",
  "priority": "high"
}`;

    const response = await promptEngineService.generateStructuredResponse<{
      goal: string;
      tasks: TaskItem[];
    }>({
      systemPrompt,
      userInput: input,
      apiKey,
      schema: {
        goal: 'string',
        tasks: 'array'
      },
      temperature: 0.7
    });

    if (response.status !== 'success') {
      throw new Error('Failed to generate task decomposition');
    }

    // Validate tasks structure
    this.validateTasksStructure(response.data.tasks);

    return response.data;
  }

  /**
   * Validate tasks have correct structure
   */
  private validateTasksStructure(tasks: any[]): void {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Tasks must be a non-empty array');
    }

    if (tasks.length > 20) {
      throw new Error('Too many tasks generated (max 20)');
    }

    for (const task of tasks) {
      if (!task.title || typeof task.title !== 'string') {
        throw new Error('Each task must have a title (string)');
      }

      if (!task.description || typeof task.description !== 'string') {
        throw new Error('Each task must have a description (string)');
      }

      if (!task.priority || !['high', 'medium', 'low'].includes(task.priority)) {
        throw new Error('Each task must have a valid priority (high, medium, or low)');
      }
    }
  }

  /**
   * Store tasks in database
   */
  private async storeTasks(input: {
    goal: string;
    tasks: TaskItem[];
    sessionId: string;
    userId: string;
  }): Promise<void> {
    try {
      // Create all tasks in a transaction
      await db.$transaction(
        input.tasks.map((task, index) =>
          db.task.create({
            data: {
              sessionId: input.sessionId,
              userId: input.userId,
              goal: input.goal,
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: 'pending',
              order: index
            }
          })
        )
      );

      logger.info('[Task] Tasks stored successfully', {
        sessionId: input.sessionId,
        taskCount: input.tasks.length
      });

    } catch (error: any) {
      logger.error('[Task] Failed to store tasks', {
        error: error.message,
        sessionId: input.sessionId
      });
      throw error;
    }
  }

  /**
   * Get tasks for a session
   */
  async getSessionTasks(sessionId: string): Promise<StoredTask[]> {
    try {
      logger.debug('[Task] Fetching session tasks', { sessionId });

      const tasks = await db.task.findMany({
        where: { sessionId },
        orderBy: { order: 'asc' }
      });

      logger.debug('[Task] Session tasks fetched', {
        sessionId,
        taskCount: tasks.length
      });

      return tasks;

    } catch (error: any) {
      logger.error('[Task] Failed to fetch session tasks', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Get tasks for a user
   */
  async getUserTasks(userId: string, status?: string): Promise<StoredTask[]> {
    try {
      logger.debug('[Task] Fetching user tasks', { userId, status });

      const tasks = await db.task.findMany({
        where: {
          userId,
          ...(status && { status })
        },
        orderBy: [
          { createdAt: 'desc' },
          { order: 'asc' }
        ]
      });

      logger.debug('[Task] User tasks fetched', {
        userId,
        taskCount: tasks.length
      });

      return tasks;

    } catch (error: any) {
      logger.error('[Task] Failed to fetch user tasks', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Create a single task
   */
  async createTask(data: {
    sessionId: string;
    userId: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<StoredTask> {
    try {
      logger.info('[Task] Creating single task', { 
        userId: data.userId, 
        sessionId: data.sessionId 
      });

      const task = await db.task.create({
        data: {
          sessionId: data.sessionId,
          userId: data.userId,
          title: data.description.substring(0, 50),
          description: data.description,
          priority: data.priority || 'medium',
          status: 'pending',
          goal: data.description, // Default goal to description for single tasks
          order: 0 // Default order
        }
      });

      return task as unknown as StoredTask;
    } catch (error: any) {
      logger.error('[Task] Failed to create task', {
        error: error.message,
        userId: data.userId
      });
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      logger.debug('[Task] Updating task status', { taskId, status });

      const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      await db.task.update({
        where: { id: taskId },
        data: { status }
      });

      logger.debug('[Task] Task status updated', { taskId, status });

    } catch (error: any) {
      logger.error('[Task] Failed to update task status', {
        error: error.message,
        taskId
      });
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      logger.info('[Task] Deleting task', { taskId });

      await db.task.delete({
        where: { id: taskId }
      });

      logger.info('[Task] Task deleted', { taskId });

    } catch (error: any) {
      logger.error('[Task] Failed to delete task', {
        error: error.message,
        taskId
      });
      throw error;
    }
  }

  /**
   * Check if input looks like a goal/project
   */
  isGoalInput(input: string): boolean {
    const goalKeywords = [
      'build',
      'create',
      'develop',
      'implement',
      'make',
      'design',
      'setup',
      'configure',
      'integrate',
      'add feature',
      'new feature',
      'project',
      'system',
      'application',
      'service',
      'engine',
      'module',
      'component'
    ];

    const inputLower = input.toLowerCase().trim();

    // Check for goal keywords
    const hasGoalKeyword = goalKeywords.some(keyword => inputLower.includes(keyword));

    // Check for reasonable length (goals are usually descriptive)
    const hasReasonableLength = input.length > 15 && input.length < 500;

    // Check if it's not a question
    const isNotQuestion = !inputLower.startsWith('what') &&
                          !inputLower.startsWith('how') &&
                          !inputLower.startsWith('why') &&
                          !inputLower.startsWith('when') &&
                          !inputLower.startsWith('where') &&
                          !inputLower.includes('?');

    return hasGoalKeyword && hasReasonableLength && isNotQuestion;
  }

  /**
   * Get task statistics for a user
   */
  async getTaskStats(userId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    cancelled: number;
  }> {
    try {
      logger.debug('[Task] Fetching task stats', { userId });

      const [total, pending, inProgress, done, cancelled] = await Promise.all([
        db.task.count({ where: { userId } }),
        db.task.count({ where: { userId, status: 'pending' } }),
        db.task.count({ where: { userId, status: 'in_progress' } }),
        db.task.count({ where: { userId, status: 'done' } }),
        db.task.count({ where: { userId, status: 'cancelled' } })
      ]);

      return { total, pending, inProgress, done, cancelled };

    } catch (error: any) {
      logger.error('[Task] Failed to fetch task stats', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

export const taskService = new TaskService();
export default taskService;
