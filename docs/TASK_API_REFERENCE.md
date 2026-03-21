# Task Decomposition API Reference

## 🎯 Quick Reference

### Task Service Functions

```typescript
import taskService from './services/task.service';
```

---

## Core Functions

### `decomposeTask(input: DecomposeTaskInput)`

Decomposes a goal into actionable tasks.

**Input:**
```typescript
{
  input: string;      // User's goal
  sessionId: string;  // Current session ID
  userId: string;     // User ID
}
```

**Output:**
```typescript
{
  goal: string;
  tasks: TaskItem[];
  metadata: {
    sessionId: string;
    taskCount: number;
    processingTimeMs: number;
  };
}
```

**Example:**
```typescript
const result = await taskService.decomposeTask({
  input: 'build resume engine',
  sessionId: 'session123',
  userId: 'user456'
});

console.log(result.goal);
console.log(`Generated ${result.tasks.length} tasks`);
```

---

### `getSessionTasks(sessionId: string)`

Gets all tasks for a session.

**Output:**
```typescript
StoredTask[]
```

**Example:**
```typescript
const tasks = await taskService.getSessionTasks('session123');
console.log(`Found ${tasks.length} tasks`);
```

---

### `getUserTasks(userId: string, status?: string)`

Gets all tasks for a user, optionally filtered by status.

**Parameters:**
- `userId`: User ID
- `status`: Optional filter ('pending', 'in_progress', 'done', 'cancelled')

**Output:**
```typescript
StoredTask[]
```

**Examples:**
```typescript
// All tasks
const allTasks = await taskService.getUserTasks('user456');

// Only pending tasks
const pending = await taskService.getUserTasks('user456', 'pending');

// Only completed tasks
const done = await taskService.getUserTasks('user456', 'done');
```

---

### `updateTaskStatus(taskId: string, status: string)`

Updates a task's status.

**Valid Statuses:**
- `pending`: Not started
- `in_progress`: Currently working on
- `done`: Completed
- `cancelled`: Abandoned

**Example:**
```typescript
// Start working on task
await taskService.updateTaskStatus('task123', 'in_progress');

// Complete task
await taskService.updateTaskStatus('task123', 'done');

// Cancel task
await taskService.updateTaskStatus('task123', 'cancelled');
```

---

### `deleteTask(taskId: string)`

Permanently deletes a task.

**Example:**
```typescript
await taskService.deleteTask('task123');
```

---

### `getTaskStats(userId: string)`

Gets task statistics for a user.

**Output:**
```typescript
{
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  cancelled: number;
}
```

**Example:**
```typescript
const stats = await taskService.getTaskStats('user456');
console.log(`Total: ${stats.total}`);
console.log(`Pending: ${stats.pending}`);
console.log(`Done: ${stats.done}`);
```

---

### `isGoalInput(input: string)`

Checks if input looks like a goal/project.

**Output:**
```typescript
boolean
```

**Example:**
```typescript
taskService.isGoalInput('build resume engine');  // true
taskService.isGoalInput('What is authentication?');  // false
taskService.isGoalInput('build app');  // false (too short)
```

---

## Types

### `DecomposeTaskInput`

```typescript
interface DecomposeTaskInput {
  input: string;
  sessionId: string;
  userId: string;
}
```

### `TaskItem`

```typescript
interface TaskItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}
```

### `TaskDecompositionResult`

```typescript
interface TaskDecompositionResult {
  goal: string;
  tasks: TaskItem[];
  metadata: {
    sessionId: string;
    taskCount: number;
    processingTimeMs: number;
  };
}
```

### `StoredTask`

```typescript
interface StoredTask {
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
```

---

## Database Schema

### Task Model

```prisma
model Task {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String
  goal        String   @db.Text
  title       String
  description String   @db.Text
  status      String   @default("pending")
  priority    String   @default("medium")
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sessionId])
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("tasks")
}
```

---

## Orchestrator Integration

The task decomposition is automatically triggered by the orchestrator when:

1. Input contains goal keywords (build, create, develop, etc.)
2. Input length is reasonable (20-300 chars)
3. SessionId is provided
4. Input is not a question

**Automatic Detection:**
```typescript
if (taskService.isGoalInput(input) && sessionId) {
  const shouldDecompose = await this.shouldDecomposeIntoTasks(input);
  
  if (shouldDecompose) {
    return await this.handleTaskDecomposition(input, userId, sessionId, servicesUsed, startTime);
  }
}
```

---

## HTTP API

### Decompose Task (via Chat)

**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "message": "build resume engine",
  "sessionId": "session123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_DECOMPOSITION",
    "output": "I've broken down your goal into actionable tasks:\n\n**Goal:** ...",
    "actions": [{
      "type": "task_decomposition",
      "status": "completed",
      "details": {
        "goal": "...",
        "taskCount": 7,
        "tasks": [...]
      }
    }],
    "metadata": {
      "processingTimeMs": 2341,
      "confidence": 1.0,
      "servicesUsed": ["task", "gemini"]
    }
  }
}
```

---

## Error Handling

### Common Errors

**Invalid Status:**
```typescript
try {
  await taskService.updateTaskStatus('task123', 'invalid');
} catch (error) {
  // Error: Invalid status: invalid. Must be one of: pending, in_progress, done, cancelled
}
```

**Task Not Found:**
```typescript
try {
  await taskService.deleteTask('nonexistent');
} catch (error) {
  // Prisma error: Record not found
}
```

**Validation Error:**
```typescript
try {
  await taskService.decomposeTask({
    input: 'x',  // Too short
    sessionId: 'session123',
    userId: 'user456'
  });
} catch (error) {
  // Error: Failed to generate task decomposition
}
```

---

## Best Practices

### 1. Always Provide SessionId

```typescript
// ✅ Good
await taskService.decomposeTask({
  input: 'build resume engine',
  sessionId: 'session123',
  userId: 'user456'
});

// ❌ Bad - tasks won't be linked to conversation
await taskService.decomposeTask({
  input: 'build resume engine',
  sessionId: '',  // Empty!
  userId: 'user456'
});
```

### 2. Check Goal Detection First

```typescript
const input = 'build resume engine';

if (taskService.isGoalInput(input)) {
  // Decompose into tasks
  const result = await taskService.decomposeTask({
    input,
    sessionId,
    userId
  });
} else {
  // Handle as normal message
}
```

### 3. Update Status Progressively

```typescript
// Start task
await taskService.updateTaskStatus(taskId, 'in_progress');

// ... do work ...

// Complete task
await taskService.updateTaskStatus(taskId, 'done');
```

### 4. Use Transactions for Bulk Operations

```typescript
// The service already uses transactions internally
// for creating multiple tasks atomically
const result = await taskService.decomposeTask({
  input: 'build resume engine',
  sessionId,
  userId
});
// All tasks created or none
```

### 5. Filter Tasks by Status

```typescript
// Get only pending tasks
const pending = await taskService.getUserTasks(userId, 'pending');

// Get only completed tasks
const done = await taskService.getUserTasks(userId, 'done');

// Get all tasks
const all = await taskService.getUserTasks(userId);
```

---

## Performance Tips

### 1. Use Indexes

The Task model has indexes on:
- `sessionId`: Fast session lookups
- `userId`: Fast user lookups
- `status`: Fast status filtering
- `createdAt`: Fast chronological ordering

### 2. Limit Results

```typescript
// Get recent tasks only
const tasks = await taskService.getUserTasks(userId);
const recentTasks = tasks.slice(0, 10);
```

### 3. Cache Statistics

```typescript
// Cache task stats for dashboard
const stats = await taskService.getTaskStats(userId);
// Cache for 5 minutes
```

### 4. Batch Status Updates

```typescript
// Update multiple tasks
const taskIds = ['task1', 'task2', 'task3'];
await Promise.all(
  taskIds.map(id => taskService.updateTaskStatus(id, 'done'))
);
```

---

## Integration Examples

### With Resume Engine

```typescript
// In resume service
const resumeResult = await resumeService.resumeWork(userId, sessionId);

// Get pending tasks for this session
const pendingTasks = await taskService.getSessionTasks(sessionId);
const pending = pendingTasks.filter(t => t.status === 'pending');

// Include in resume summary
resumeResult.nextSteps.push(
  ...pending.map(t => `Complete task: ${t.title}`)
);
```

### With Notion Integration

```typescript
// Export tasks to Notion
const tasks = await taskService.getSessionTasks(sessionId);

for (const task of tasks) {
  await notionWriteService.createInboxEntry({
    title: task.title,
    type: 'task',
    tags: [task.priority, task.status],
    content: task.description,
    source: `Task from session ${sessionId}`,
    userId
  });
}
```

### With Progress Tracking

```typescript
// Calculate progress
const stats = await taskService.getTaskStats(userId);
const progress = (stats.done / stats.total) * 100;

console.log(`Progress: ${progress.toFixed(1)}%`);
console.log(`Completed: ${stats.done}/${stats.total}`);
```

---

## Logging

The task service logs all operations:

```typescript
// Info logs
[Task] Starting task decomposition
[Task] Task decomposition generated
[Task] Tasks stored in database
[Task] Tasks stored successfully

// Debug logs
[Task] Fetching session tasks
[Task] Session tasks fetched
[Task] Updating task status
[Task] Task status updated

// Error logs
[Task] Task decomposition failed
[Task] Failed to store tasks
[Task] Failed to fetch session tasks
[Task] Failed to update task status
```

---

## Summary

The Task Service provides:

✅ AI-powered task decomposition
✅ Database persistence
✅ CRUD operations
✅ Status tracking
✅ Priority management
✅ Statistics and analytics
✅ Goal detection
✅ Error handling
✅ Comprehensive logging

Use it to break down complex goals into manageable, trackable tasks!
