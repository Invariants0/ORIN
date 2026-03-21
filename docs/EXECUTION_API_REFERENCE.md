# Task Execution API Reference

## 🎯 Quick Reference

### Execution Service Functions

```typescript
import executionService from './services/execution.service';
```

---

## Core Functions

### `executeNextTask(input: ExecuteNextTaskInput)`

Executes the next pending task based on priority and order.

**Input:**
```typescript
{
  sessionId: string;
  userId: string;
}
```

**Output:**
```typescript
{
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
```

**Example:**
```typescript
const plan = await executionService.executeNextTask({
  sessionId: 'session123',
  userId: 'user456'
});

console.log(`Working on: ${plan.task.title}`);
console.log(`Priority: ${plan.task.priority}`);
console.log(`Approach: ${plan.approach}`);
console.log(`Steps: ${plan.steps.length}`);
console.log(`Time: ${plan.estimatedTime}`);
console.log(`Risks: ${plan.risks.length}`);
```

**Throws:**
- `Error('No tasks found for this session')`
- `Error('No pending tasks found. All tasks are completed or in progress.')`
- `Error('Failed to generate execution plan')`

---

### `completeTask(taskId: string, userId: string)`

Marks a task as done and suggests the next task.

**Output:**
```typescript
{
  taskId: string;
  title: string;
  completedAt: Date;
  nextTask: {
    id: string;
    title: string;
    priority: string;
  } | null;
}
```

**Example:**
```typescript
const result = await executionService.completeTask('task123', 'user456');

console.log(`Completed: ${result.title}`);
console.log(`Completed at: ${result.completedAt}`);

if (result.nextTask) {
  console.log(`Next task: ${result.nextTask.title}`);
  console.log(`Priority: ${result.nextTask.priority}`);
} else {
  console.log('All tasks complete!');
}
```

**Throws:**
- `Error('Task not found or does not belong to user')`
- `Error('Task is already completed')`

---

### `getCurrentTask(sessionId: string)`

Gets the current in-progress task for a session.

**Output:**
```typescript
StoredTask | null
```

**Example:**
```typescript
const current = await executionService.getCurrentTask('session123');

if (current) {
  console.log(`Currently working on: ${current.title}`);
  console.log(`Description: ${current.description}`);
  console.log(`Priority: ${current.priority}`);
} else {
  console.log('No task in progress');
}
```

---

### `cancelTask(taskId: string, userId: string)`

Cancels a task (sets status to 'cancelled').

**Example:**
```typescript
await executionService.cancelTask('task123', 'user456');
console.log('Task cancelled');
```

**Throws:**
- `Error('Task not found or does not belong to user')`

---

### `getExecutionProgress(sessionId: string)`

Gets execution progress statistics for a session.

**Output:**
```typescript
{
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  cancelled: number;
  percentComplete: number;
  currentTask: StoredTask | null;
}
```

**Example:**
```typescript
const progress = await executionService.getExecutionProgress('session123');

console.log(`Total: ${progress.total}`);
console.log(`Pending: ${progress.pending}`);
console.log(`In Progress: ${progress.inProgress}`);
console.log(`Done: ${progress.done}`);
console.log(`Cancelled: ${progress.cancelled}`);
console.log(`Percent Complete: ${progress.percentComplete}%`);

if (progress.currentTask) {
  console.log(`Current Task: ${progress.currentTask.title}`);
}
```

---

### `isExecutionRequest(input: string)`

Checks if input is a task execution request.

**Output:**
```typescript
boolean
```

**Example:**
```typescript
executionService.isExecutionRequest('start working');  // true
executionService.isExecutionRequest('next task');  // true
executionService.isExecutionRequest('hello');  // false
```

**Detection Keywords:**
- start working
- do next task
- next task
- start task
- begin task
- work on
- execute task
- run task
- start next
- what should i do
- what to do next
- get started

---

### `isCompletionRequest(input: string)`

Checks if input is a task completion request.

**Output:**
```typescript
boolean
```

**Example:**
```typescript
executionService.isCompletionRequest('task done');  // true
executionService.isCompletionRequest('finished task');  // true
executionService.isCompletionRequest('hello');  // false
```

**Detection Keywords:**
- task done
- task complete
- finished task
- completed task
- mark done
- mark complete
- task finished
- done with task
- finished working

---

## Types

### `ExecuteNextTaskInput`

```typescript
interface ExecuteNextTaskInput {
  sessionId: string;
  userId: string;
}
```

### `ExecutionPlan`

```typescript
interface ExecutionPlan {
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
```

### `CompleteTaskResult`

```typescript
interface CompleteTaskResult {
  taskId: string;
  title: string;
  completedAt: Date;
  nextTask: {
    id: string;
    title: string;
    priority: string;
  } | null;
}
```

---

## Task Selection Logic

### Priority Weights

```typescript
const priorityWeight = {
  high: 3,
  medium: 2,
  low: 1
};
```

### Selection Algorithm

```typescript
1. Filter tasks by status === 'pending'
2. Sort by:
   a. Priority (descending) - higher priority first
   b. Order (ascending) - lower order first
3. Select first task
```

### Example Selection

```typescript
Tasks:
[
  { priority: 'medium', order: 2 },  // Weight: 2, Order: 2
  { priority: 'high', order: 5 },    // Weight: 3, Order: 5
  { priority: 'high', order: 1 },    // Weight: 3, Order: 1 ✅ SELECTED
  { priority: 'low', order: 0 }      // Weight: 1, Order: 0
]

Selected: { priority: 'high', order: 1 }
Reason: Highest priority (3), lowest order among high priority tasks (1)
```

---

## Orchestrator Integration

### Automatic Detection

The orchestrator automatically detects execution and completion requests:

```typescript
// Execution detection
if (executionService.isExecutionRequest(input) && sessionId) {
  return await this.handleTaskExecution(userId, sessionId, servicesUsed, startTime);
}

// Completion detection
if (executionService.isCompletionRequest(input) && sessionId) {
  return await this.handleTaskCompletion(userId, sessionId, servicesUsed, startTime);
}
```

### HTTP API

**Execute Next Task:**
```bash
POST /api/chat
{
  "message": "start working",
  "sessionId": "session123"
}
```

**Complete Task:**
```bash
POST /api/chat
{
  "message": "task done",
  "sessionId": "session123"
}
```

---

## Execution Plan Generation

### Prompt Template

```typescript
System: You are a technical execution planner.

Task Title: "[title]"
Task Description: "[description]"
Priority: [priority]

Your task:
1. Describe the overall approach
2. Break down into 3-7 concrete steps
3. Estimate time required
4. Identify potential risks

Guidelines:
- Be specific and technical
- Steps should be sequential
- Each step should be actionable
- Time estimate should be realistic
- Risks should be concrete
```

### Response Schema

```typescript
{
  approach: 'string',
  steps: 'array',
  estimatedTime: 'string',
  risks: 'array'
}
```

### Validation Rules

- `approach`: Must be non-empty string
- `steps`: Must be array with 1-15 items
- `estimatedTime`: Must be non-empty string
- `risks`: Must be array (can be empty)

---

## Status Transitions

### Valid Transitions

```
pending → in_progress  (executeNextTask)
in_progress → done     (completeTask)
in_progress → cancelled (cancelTask)
pending → cancelled    (cancelTask)
```

### Invalid Transitions

```
done → in_progress     ❌
done → pending         ❌
cancelled → in_progress ❌
```

---

## Error Handling

### Common Errors

**No Tasks Found:**
```typescript
try {
  await executionService.executeNextTask({ sessionId, userId });
} catch (error) {
  // Error: No tasks found for this session
}
```

**No Pending Tasks:**
```typescript
try {
  await executionService.executeNextTask({ sessionId, userId });
} catch (error) {
  // Error: No pending tasks found. All tasks are completed or in progress.
}
```

**Task Already Complete:**
```typescript
try {
  await executionService.completeTask('task123', 'user456');
} catch (error) {
  // Error: Task is already completed
}
```

**Task Not Found:**
```typescript
try {
  await executionService.completeTask('invalid', 'user456');
} catch (error) {
  // Error: Task not found or does not belong to user
}
```

---

## Best Practices

### 1. Always Check Session Has Tasks

```typescript
const tasks = await taskService.getSessionTasks(sessionId);

if (tasks.length === 0) {
  console.log('No tasks in session. Decompose a goal first.');
} else {
  const plan = await executionService.executeNextTask({ sessionId, userId });
}
```

### 2. Track Progress Regularly

```typescript
const progress = await executionService.getExecutionProgress(sessionId);

console.log(`Progress: ${progress.percentComplete}%`);
console.log(`Remaining: ${progress.pending} tasks`);
```

### 3. Handle Completion Gracefully

```typescript
const result = await executionService.completeTask(taskId, userId);

if (result.nextTask) {
  console.log(`Next: ${result.nextTask.title}`);
  // Optionally auto-start next task
} else {
  console.log('All tasks complete! 🎉');
  // Celebrate or start new goal
}
```

### 4. Use Current Task for Context

```typescript
const current = await executionService.getCurrentTask(sessionId);

if (current) {
  console.log(`Resume working on: ${current.title}`);
} else {
  console.log('No task in progress. Start a new one!');
}
```

### 5. Cancel Tasks When Needed

```typescript
// If task is no longer relevant
await executionService.cancelTask(taskId, userId);

// Then start next task
const plan = await executionService.executeNextTask({ sessionId, userId });
```

---

## Performance Tips

### 1. Cache Progress

```typescript
// Cache progress for dashboard
const progress = await executionService.getExecutionProgress(sessionId);
// Cache for 1 minute
```

### 2. Batch Operations

```typescript
// Get all needed data at once
const [current, progress, tasks] = await Promise.all([
  executionService.getCurrentTask(sessionId),
  executionService.getExecutionProgress(sessionId),
  taskService.getSessionTasks(sessionId)
]);
```

### 3. Limit AI Calls

```typescript
// Execution plan is generated once per task
// Reuse the plan, don't regenerate
```

---

## Integration Examples

### With Resume Engine

```typescript
// In resume service
const resumeResult = await resumeService.resumeWork(userId, sessionId);

// Add current task to resume
const current = await executionService.getCurrentTask(sessionId);
if (current) {
  resumeResult.currentState += `\n\nCurrently working on: ${current.title}`;
}

// Add progress
const progress = await executionService.getExecutionProgress(sessionId);
resumeResult.nextSteps.unshift(
  `Continue task: ${current?.title} (${progress.percentComplete}% complete)`
);
```

### With Task Decomposition

```typescript
// After decomposing goal
const decomposition = await taskService.decomposeTask({ input, sessionId, userId });

// Automatically start first task
const plan = await executionService.executeNextTask({ sessionId, userId });

console.log(`Goal: ${decomposition.goal}`);
console.log(`First task: ${plan.task.title}`);
console.log(`Steps: ${plan.steps.length}`);
```

### With Progress Dashboard

```typescript
// Dashboard component
async function getDashboard(sessionId: string) {
  const progress = await executionService.getExecutionProgress(sessionId);
  
  return {
    totalTasks: progress.total,
    completedTasks: progress.done,
    percentComplete: progress.percentComplete,
    currentTask: progress.currentTask?.title || 'None',
    pendingTasks: progress.pending,
    inProgressTasks: progress.inProgress
  };
}
```

---

## Logging

The execution service logs all operations:

```typescript
// Info logs
[Execution] Starting next task execution
[Execution] Found pending tasks
[Execution] Selected next task
[Execution] Execution plan generated
[Execution] Task status updated to in_progress
[Execution] Completing task
[Execution] Task marked as done
[Execution] Next task identified

// Debug logs
[Execution] Getting current task
[Execution] Getting execution progress

// Error logs
[Execution] Failed to execute next task
[Execution] Failed to complete task
[Execution] Failed to get current task
[Execution] Failed to cancel task
```

---

## Summary

The Execution Service provides:

✅ Intelligent task selection (priority + order)
✅ AI-powered execution plans
✅ Automatic status management
✅ Task completion tracking
✅ Progress monitoring
✅ Next task suggestions
✅ Natural language detection
✅ Comprehensive error handling
✅ Production-ready logging

Use it to execute tasks systematically with detailed guidance!
