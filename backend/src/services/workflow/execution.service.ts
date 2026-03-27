import logger from '@/config/logger.js';
import taskService, { StoredTask } from '@/services/workflow/task.service.js';
import promptEngineService from '@/services/ai/prompt-engine.service.js';
import adaptiveService from '@/services/ai/adaptive.service.js';

export interface ExecuteNextTaskInput {
  sessionId: string;
  userId: string;
}

export interface ExecutionPlan {
  task: {
    id: string;
    title: string;
    description: string;
    priority: string;
    order: number;
  };
  approach: string;
  steps: string[];
  estimatedTime: string;
  risks: string[];
  metadata: {
    sessionId: string;
    processingTimeMs: number;
  };
}

export interface CompleteTaskResult {
  taskId: string;
  title: string;
  completedAt: Date;
  nextTask: {
    id: string;
    title: string;
    priority: string;
  } | null;
}

class ExecutionService {
  /**
   * Execute the next pending task
   */
  async executeNextTask(input: ExecuteNextTaskInput, apiKey?: string): Promise<ExecutionPlan> {
    const startTime = Date.now();

    try {
      logger.info('[Execution] Starting next task execution', {
        userId: input.userId,
        sessionId: input.sessionId
      });

      // Step 1: Get pending tasks for session
      const tasks = await taskService.getSessionTasks(input.sessionId);
      
      if (tasks.length === 0) {
        throw new Error('No tasks found for this session');
      }

      // Step 2: Filter pending tasks
      const pendingTasks = tasks.filter(t => t.status === 'pending');

      if (pendingTasks.length === 0) {
        throw new Error('No pending tasks found. All tasks are completed or in progress.');
      }

      logger.info('[Execution] Found pending tasks', {
        totalTasks: tasks.length,
        pendingTasks: pendingTasks.length
      });

      // Step 3: Pick next task (highest priority, lowest order)
      const nextTask = this.selectNextTask(pendingTasks);

      logger.info('[Execution] Selected next task', {
        taskId: nextTask.id,
        title: nextTask.title,
        priority: nextTask.priority,
        order: nextTask.order
      });

      // Step 4: Generate execution plan using Prompt Engine
      const plan = await this.generateExecutionPlan(nextTask, apiKey);

      logger.info('[Execution] Execution plan generated', {
        taskId: nextTask.id,
        stepsCount: plan.steps.length,
        estimatedTime: plan.estimatedTime
      });

      // Step 5: Update task status to in_progress
      await taskService.updateTaskStatus(nextTask.id, 'in_progress');

      logger.info('[Execution] Task status updated to in_progress', {
        taskId: nextTask.id
      });

      // Step 6: Track task start in adaptive layer
      await adaptiveService.trackTaskStart(nextTask.id, plan.estimatedTime);

      const processingTimeMs = Date.now() - startTime;

      return {
        task: {
          id: nextTask.id,
          title: nextTask.title,
          description: nextTask.description,
          priority: nextTask.priority,
          order: nextTask.order
        },
        approach: plan.approach,
        steps: plan.steps,
        estimatedTime: plan.estimatedTime,
        risks: plan.risks,
        metadata: {
          sessionId: input.sessionId,
          processingTimeMs
        }
      };

    } catch (error: any) {
      logger.error('[Execution] Failed to execute next task', {
        error: error.message,
        userId: input.userId,
        sessionId: input.sessionId
      });
      throw error;
    }
  }

  /**
   * Select the next task to execute
   * Priority: high > medium > low
   * Then by order (ascending)
   */
  private selectNextTask(pendingTasks: StoredTask[]): StoredTask {
    // Priority weights
    const priorityWeight = {
      high: 3,
      medium: 2,
      low: 1
    };

    // Sort by priority (descending) then by order (ascending)
    const sorted = pendingTasks.sort((a, b) => {
      const priorityA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
      const priorityB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      return a.order - b.order; // Lower order first
    });

    return sorted[0];
  }

  /**
   * Generate execution plan using Prompt Engine
   */
  private async generateExecutionPlan(task: StoredTask, apiKey?: string): Promise<{
    approach: string;
    steps: string[];
    estimatedTime: string;
    risks: string[];
  }> {
    const systemPrompt = `You are a technical execution planner. Create a detailed execution plan for the given task.

Task Title: "${task.title}"
Task Description: "${task.description}"
Priority: ${task.priority}

Your task:
1. Describe the overall approach to complete this task
2. Break down the approach into 3-7 concrete, actionable steps
3. Estimate the time required (be realistic)
4. Identify potential risks or challenges

Guidelines:
- Be specific and technical
- Steps should be sequential and logical
- Each step should be clear and actionable
- Time estimate should be realistic (e.g., "2-3 hours", "1 day", "30 minutes")
- Risks should be concrete and addressable
- Consider dependencies and prerequisites

Example output structure:
{
  "approach": "Start by setting up the database schema, then implement the service layer with business logic, and finally add API endpoints with proper validation.",
  "steps": [
    "Create Prisma schema with Task model including all required fields",
    "Generate Prisma migration and apply to database",
    "Implement task.service.ts with CRUD operations",
    "Add validation logic for task status and priority",
    "Integrate with orchestrator for automatic task detection",
    "Write unit tests for task service functions"
  ],
  "estimatedTime": "3-4 hours",
  "risks": [
    "Database migration might conflict with existing schema",
    "Task priority logic needs careful validation",
    "Integration with orchestrator requires testing"
  ]
}`;

    const response = await promptEngineService.generateStructuredResponse<{
      approach: string;
      steps: string[];
      estimatedTime: string;
      risks: string[];
    }>({
      systemPrompt,
      userInput: `Generate execution plan for: ${task.title}`,
      apiKey,
      schema: {
        approach: 'string',
        steps: 'array',
        estimatedTime: 'string',
        risks: 'array'
      },
      temperature: 0.7
    });

    if (response.status !== 'success') {
      throw new Error('Failed to generate execution plan');
    }

    // Validate response structure
    this.validateExecutionPlan(response.data);

    return response.data;
  }

  /**
   * Validate execution plan structure
   */
  private validateExecutionPlan(plan: any): void {
    if (!plan.approach || typeof plan.approach !== 'string') {
      throw new Error('Execution plan must have an approach (string)');
    }

    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error('Execution plan must have steps (non-empty array)');
    }

    if (plan.steps.length > 15) {
      throw new Error('Too many steps in execution plan (max 15)');
    }

    if (!plan.estimatedTime || typeof plan.estimatedTime !== 'string') {
      throw new Error('Execution plan must have estimatedTime (string)');
    }

    if (!Array.isArray(plan.risks)) {
      throw new Error('Execution plan must have risks (array)');
    }
  }

  /**
   * Complete a task and get next task suggestion
   */
  async completeTask(taskId: string, userId: string): Promise<CompleteTaskResult> {
    try {
      logger.info('[Execution] Completing task', { taskId, userId });

      // Get task details before updating
      const tasks = await taskService.getUserTasks(userId);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        throw new Error('Task not found or does not belong to user');
      }

      if (task.status === 'done') {
        throw new Error('Task is already completed');
      }

      // Update task status to done
      await taskService.updateTaskStatus(taskId, 'done');

      logger.info('[Execution] Task marked as done', { taskId, title: task.title });

      // Track completion in adaptive layer
      await adaptiveService.trackTaskCompletion(taskId, true);

      // Get next pending task from same session
      const sessionTasks = await taskService.getSessionTasks(task.sessionId);
      const pendingTasks = sessionTasks.filter(t => t.status === 'pending');

      let nextTask = null;
      if (pendingTasks.length > 0) {
        const selected = this.selectNextTask(pendingTasks);
        nextTask = {
          id: selected.id,
          title: selected.title,
          priority: selected.priority
        };

        logger.info('[Execution] Next task identified', {
          nextTaskId: nextTask.id,
          nextTaskTitle: nextTask.title
        });
      } else {
        logger.info('[Execution] No more pending tasks in session', {
          sessionId: task.sessionId
        });
      }

      return {
        taskId,
        title: task.title,
        completedAt: new Date(),
        nextTask
      };

    } catch (error: any) {
      logger.error('[Execution] Failed to complete task', {
        error: error.message,
        taskId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get current task in progress for a session
   */
  async getCurrentTask(sessionId: string): Promise<StoredTask | null> {
    try {
      logger.debug('[Execution] Getting current task', { sessionId });

      const tasks = await taskService.getSessionTasks(sessionId);
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

      if (inProgressTasks.length === 0) {
        return null;
      }

      // Return the first in-progress task (should only be one)
      return inProgressTasks[0];

    } catch (error: any) {
      logger.error('[Execution] Failed to get current task', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, userId: string): Promise<void> {
    try {
      logger.info('[Execution] Cancelling task', { taskId, userId });

      // Verify task belongs to user
      const tasks = await taskService.getUserTasks(userId);
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        throw new Error('Task not found or does not belong to user');
      }

      await taskService.updateTaskStatus(taskId, 'cancelled');

      logger.info('[Execution] Task cancelled', { taskId, title: task.title });

    } catch (error: any) {
      logger.error('[Execution] Failed to cancel task', {
        error: error.message,
        taskId,
        userId
      });
      throw error;
    }
  }

  /**
   * Check if input is an execution request
   */
  isExecutionRequest(input: string): boolean {
    const executionKeywords = [
      'start working',
      'do next task',
      'next task',
      'start task',
      'begin task',
      'work on',
      'execute task',
      'run task',
      'start next',
      'what should i do',
      'what to do next',
      'get started'
    ];

    const inputLower = input.toLowerCase().trim();

    return executionKeywords.some(keyword => inputLower.includes(keyword));
  }

  /**
   * Check if input is a completion request
   */
  isCompletionRequest(input: string): boolean {
    const completionKeywords = [
      'task done',
      'task complete',
      'finished task',
      'completed task',
      'mark done',
      'mark complete',
      'task finished',
      'done with task',
      'finished working'
    ];

    const inputLower = input.toLowerCase().trim();

    return completionKeywords.some(keyword => inputLower.includes(keyword));
  }

  /**
   * Get execution progress for a session
   */
  async getExecutionProgress(sessionId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    cancelled: number;
    percentComplete: number;
    currentTask: StoredTask | null;
  }> {
    try {
      logger.debug('[Execution] Getting execution progress', { sessionId });

      const tasks = await taskService.getSessionTasks(sessionId);

      const total = tasks.length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;
      const done = tasks.filter(t => t.status === 'done').length;
      const cancelled = tasks.filter(t => t.status === 'cancelled').length;

      const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0;

      const currentTask = await this.getCurrentTask(sessionId);

      return {
        total,
        pending,
        inProgress,
        done,
        cancelled,
        percentComplete,
        currentTask
      };

    } catch (error: any) {
      logger.error('[Execution] Failed to get execution progress', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }
}

export const executionService = new ExecutionService();
export default executionService;
