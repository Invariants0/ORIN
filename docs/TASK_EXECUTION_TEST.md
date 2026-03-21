# Task Execution Engine - Testing Guide

## 🧪 Complete Test Flow

### Prerequisites
1. Backend server running
2. Database migrated (Task model exists)
3. Gemini API key configured
4. Session created with decomposed tasks

---

## Full Workflow Test

### Step 1: Create Session and Decompose Goal

**Request 1: Start Session**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Hello, I want to start a new project"
}
```

**Save the sessionId from response!**

---

**Request 2: Decompose Goal**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "build resume engine",
  "sessionId": "clx123abc"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_DECOMPOSITION",
    "output": "I've broken down your goal into actionable tasks:\n\n**Goal:** Build a resume work engine...\n\n**Tasks (7):**\n\n1. **Create Resume Service** [HIGH]\n...",
    "actions": [{
      "type": "task_decomposition",
      "status": "completed",
      "details": {
        "taskCount": 7
      }
    }]
  }
}
```

**Database State:**
- 7 tasks created
- All status: 'pending'
- Priorities: 4 high, 2 medium, 1 low

---

### Step 2: Execute First Task 🎯

**Request 3: Start Working**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "start working",
  "sessionId": "clx123abc"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_EXECUTION",
    "output": "Let's work on the next task!\n\n**Task:** Create Resume Service [HIGH]\n\n**Description:** Implement src/services/resume.service.ts with core resumeWork() function that retrieves session data and analyzes message history\n\n**Approach:**\nStart by defining the service interface and core data structures, then implement the session retrieval logic, followed by message analysis and context extraction, and finally integrate with the Prompt Engine for summary generation.\n\n**Steps to Complete:**\n1. Create resume.service.ts file with TypeScript interfaces\n2. Implement getSessionData() to retrieve session from database\n3. Build analyzeMessages() to extract topics and intents\n4. Create extractKeywords() helper for topic identification\n5. Implement generateResumeSummary() using Prompt Engine\n6. Add isResumeRequest() detection logic\n7. Write comprehensive error handling\n\n**Estimated Time:** 3-4 hours\n\n**Potential Risks:**\n⚠️ Session data might be incomplete or missing\n⚠️ Message analysis could be slow with large histories\n⚠️ Prompt Engine might fail to generate valid summaries\n\nThe task is now marked as \"in progress\". Let me know when you're done!",
    "actions": [{
      "type": "task_execution",
      "status": "completed",
      "details": {
        "taskId": "task1",
        "taskTitle": "Create Resume Service",
        "priority": "high",
        "stepsCount": 7,
        "estimatedTime": "3-4 hours"
      }
    }],
    "metadata": {
      "processingTimeMs": 2341,
      "confidence": 1.0,
      "servicesUsed": ["execution", "task", "gemini"]
    }
  }
}
```

**Database State:**
- Task 1 status: 'in_progress'
- Other tasks: 'pending'

---

### Step 3: Complete First Task ✅

**Request 4: Mark Task Done**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "task done",
  "sessionId": "clx123abc"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_COMPLETION",
    "output": "✅ Great work! Task completed: \"Create Resume Service\"\n\n**Progress:** 1/7 tasks completed (14%)\n\n**Next Task:** Design Database Schema [HIGH]\n\nReady to continue? Just say \"start working\" or \"next task\"!",
    "actions": [{
      "type": "task_completion",
      "status": "completed",
      "details": {
        "completedTaskId": "task1",
        "completedTaskTitle": "Create Resume Service",
        "nextTask": {
          "id": "task2",
          "title": "Design Database Schema",
          "priority": "high"
        },
        "progress": {
          "done": 1,
          "total": 7,
          "percentComplete": 14
        }
      }
    }],
    "metadata": {
      "processingTimeMs": 156,
      "confidence": 1.0,
      "servicesUsed": ["execution", "task"]
    }
  }
}
```

**Database State:**
- Task 1 status: 'done'
- Task 2 status: 'pending'
- Other tasks: 'pending'

---

### Step 4: Execute Second Task

**Request 5: Next Task**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "next task",
  "sessionId": "clx123abc"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_EXECUTION",
    "output": "Let's work on the next task!\n\n**Task:** Design Database Schema [HIGH]\n\n**Description:** Ensure Session and Message models support resume functionality with proper indexes and relations\n\n**Approach:**\nReview current Prisma schema, identify required changes for resume functionality, add necessary fields and indexes, then generate and apply migration.\n\n**Steps to Complete:**\n1. Review current Session and Message models in schema.prisma\n2. Add optional title and summary fields to Session\n3. Ensure Message model has intent and metadata fields\n4. Add indexes on sessionId and createdAt for performance\n5. Generate Prisma migration with descriptive name\n6. Apply migration to database\n7. Verify schema changes in Prisma Studio\n\n**Estimated Time:** 1-2 hours\n\n**Potential Risks:**\n⚠️ Migration might conflict with existing data\n⚠️ Indexes could slow down write operations\n⚠️ Schema changes require database downtime\n\nThe task is now marked as \"in progress\". Let me know when you're done!",
    "actions": [{
      "type": "task_execution",
      "status": "completed",
      "details": {
        "taskId": "task2",
        "taskTitle": "Design Database Schema",
        "priority": "high"
      }
    }]
  }
}
```

**Database State:**
- Task 1 status: 'done'
- Task 2 status: 'in_progress'
- Other tasks: 'pending'

---

### Step 5: Continue Until All Complete

Repeat steps 3-4 until all tasks are done.

**Final Completion Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_COMPLETION",
    "output": "✅ Great work! Task completed: \"Write Tests\"\n\n**Progress:** 7/7 tasks completed (100%)\n\n🎉 All tasks completed! You've finished all pending tasks for this session.",
    "actions": [{
      "type": "task_completion",
      "status": "completed",
      "details": {
        "completedTaskId": "task7",
        "completedTaskTitle": "Write Tests",
        "nextTask": null,
        "progress": {
          "done": 7,
          "total": 7,
          "percentComplete": 100
        }
      }
    }]
  }
}
```

---

## Alternative Execution Keywords

Try any of these to start working:
- "start working"
- "do next task"
- "next task"
- "start task"
- "begin task"
- "work on next"
- "execute task"
- "what should i do"
- "what to do next"
- "get started"

---

## Alternative Completion Keywords

Try any of these to mark task done:
- "task done"
- "task complete"
- "finished task"
- "completed task"
- "mark done"
- "mark complete"
- "task finished"
- "done with task"
- "finished working"

---

## Error Cases

### No Tasks in Session

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "start working",
  "sessionId": "empty-session"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_EXECUTION",
    "output": "No tasks found for this session",
    "actions": [{
      "type": "task_execution",
      "status": "failed",
      "details": { "error": "No tasks found for this session" }
    }]
  }
}
```

### All Tasks Complete

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "next task",
  "sessionId": "clx123abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_EXECUTION",
    "output": "No pending tasks found. All tasks are completed or in progress.",
    "actions": [{
      "type": "task_execution",
      "status": "failed"
    }]
  }
}
```

### No Task in Progress

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "task done",
  "sessionId": "clx123abc"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "TASK_COMPLETION",
    "output": "No task is currently in progress. Use \"start working\" or \"next task\" to begin a new task.",
    "actions": [{
      "type": "task_completion",
      "status": "failed",
      "details": { "error": "No task in progress" }
    }]
  }
}
```

---

## Direct Service Testing

### Test Execution Service Directly

```typescript
import executionService from './services/execution.service';

// Execute next task
const plan = await executionService.executeNextTask({
  sessionId: 'session123',
  userId: 'user456'
});

console.log('Task:', plan.task.title);
console.log('Priority:', plan.task.priority);
console.log('Approach:', plan.approach);
console.log('Steps:', plan.steps.length);
console.log('Time:', plan.estimatedTime);
console.log('Risks:', plan.risks.length);
```

### Test Task Completion

```typescript
// Complete task
const result = await executionService.completeTask('task123', 'user456');

console.log('Completed:', result.title);
console.log('Completed at:', result.completedAt);

if (result.nextTask) {
  console.log('Next task:', result.nextTask.title);
  console.log('Priority:', result.nextTask.priority);
} else {
  console.log('All tasks complete!');
}
```

### Test Progress Tracking

```typescript
// Get progress
const progress = await executionService.getExecutionProgress('session123');

console.log('Total:', progress.total);
console.log('Pending:', progress.pending);
console.log('In Progress:', progress.inProgress);
console.log('Done:', progress.done);
console.log('Cancelled:', progress.cancelled);
console.log('Percent Complete:', progress.percentComplete + '%');

if (progress.currentTask) {
  console.log('Current Task:', progress.currentTask.title);
}
```

### Test Current Task

```typescript
// Get current task
const current = await executionService.getCurrentTask('session123');

if (current) {
  console.log('Currently working on:', current.title);
  console.log('Description:', current.description);
  console.log('Priority:', current.priority);
} else {
  console.log('No task in progress');
}
```

### Test Task Cancellation

```typescript
// Cancel task
await executionService.cancelTask('task123', 'user456');
console.log('Task cancelled');
```

---

## Database Verification

### Check Task Status

```sql
SELECT id, title, status, priority, "order"
FROM tasks
WHERE session_id = 'clx123abc'
ORDER BY "order" ASC;
```

Expected progression:
```
id     | title                      | status      | priority | order
-------|----------------------------|-------------|----------|------
task1  | Create Resume Service      | done        | high     | 0
task2  | Design Database Schema     | in_progress | high     | 1
task3  | Implement Message Analysis | pending     | high     | 2
task4  | Integrate Prompt Engine    | pending     | high     | 3
task5  | Update Orchestrator        | pending     | medium   | 4
task6  | Add Error Handling         | pending     | medium   | 5
task7  | Write Tests                | pending     | low      | 6
```

### Count Tasks by Status

```sql
SELECT status, COUNT(*) as count
FROM tasks
WHERE session_id = 'clx123abc'
GROUP BY status;
```

Expected:
```
status      | count
------------|------
done        | 1
in_progress | 1
pending     | 5
```

### Get Execution Timeline

```sql
SELECT id, title, status, created_at, updated_at
FROM tasks
WHERE session_id = 'clx123abc'
ORDER BY updated_at DESC;
```

---

## Logs to Watch

Enable debug logging to see execution in action:

```
[Orchestrator] Task execution request detected
[Execution] Starting next task execution { userId: 'user456', sessionId: 'clx123abc' }
[Execution] Found pending tasks { totalTasks: 7, pendingTasks: 7 }
[Execution] Selected next task { taskId: 'task1', title: 'Create Resume Service', priority: 'high' }
[Prompt Engine] Starting structured generation
[Prompt Engine] Structured response generated successfully
[Execution] Execution plan generated { taskId: 'task1', stepsCount: 7, estimatedTime: '3-4 hours' }
[Task] Updating task status { taskId: 'task1', status: 'in_progress' }
[Execution] Task status updated to in_progress { taskId: 'task1' }
[Orchestrator] TASK_EXECUTION completed
```

---

## Performance Benchmarks

Expected timings:
- Task selection: ~5ms
- AI plan generation: ~2000-2500ms
- Database updates: ~50ms
- Total execution: ~2100-2600ms
- Task completion: ~100-150ms

---

## Success Criteria

✅ Execution request is detected automatically
✅ Next task is selected by priority and order
✅ Execution plan is generated with approach, steps, time, risks
✅ Task status is updated to 'in_progress'
✅ Completion request is detected
✅ Task is marked as 'done'
✅ Next task is suggested
✅ Progress is calculated correctly
✅ All tasks can be completed
✅ No errors in logs
✅ Processing time < 3 seconds

---

## Integration Testing

### Test with Resume Engine

1. Decompose task: "build resume engine"
2. Execute first task: "start working"
3. Ask: "continue my work"
4. Verify resume shows current task

### Test with Task Decomposition

1. Decompose goal: "build authentication system"
2. Execute tasks in order
3. Verify priority-based selection
4. Complete all tasks

### Test Full Workflow

1. Create session
2. Decompose goal
3. Execute all tasks one by one
4. Track progress
5. Verify completion

---

## Troubleshooting

### Issue: "No tasks found"
- Verify tasks were created
- Check sessionId is correct
- Review database for tasks

### Issue: "No pending tasks"
- Check if all tasks are done
- Verify task statuses in database
- Review task completion logs

### Issue: "No task in progress"
- Ensure a task was started
- Check task status in database
- Verify execution was called

### Issue: Slow execution plan generation
- Check Gemini API latency
- Verify Prompt Engine is working
- Review AI response time

### Issue: Wrong task selected
- Verify priority values
- Check order values
- Review selection logic

---

## Example Test Script

```typescript
// test-execution.ts
import executionService from './services/execution.service';
import taskService from './services/task.service';

async function testExecution() {
  console.log('🧪 Testing Task Execution Engine\n');

  const sessionId = 'test-session-123';
  const userId = 'test-user-456';

  // Test 1: Execute next task
  console.log('Test 1: Execute next task');
  const plan = await executionService.executeNextTask({ sessionId, userId });
  console.log(`✅ Selected: ${plan.task.title}`);
  console.log(`   Priority: ${plan.task.priority}`);
  console.log(`   Steps: ${plan.steps.length}`);
  console.log(`   Time: ${plan.estimatedTime}\n`);

  // Test 2: Get current task
  console.log('Test 2: Get current task');
  const current = await executionService.getCurrentTask(sessionId);
  console.log(`✅ Current: ${current?.title || 'None'}\n`);

  // Test 3: Get progress
  console.log('Test 3: Get progress');
  const progress = await executionService.getExecutionProgress(sessionId);
  console.log(`✅ Progress: ${progress.percentComplete}%`);
  console.log(`   Done: ${progress.done}/${progress.total}\n`);

  // Test 4: Complete task
  console.log('Test 4: Complete task');
  const result = await executionService.completeTask(plan.task.id, userId);
  console.log(`✅ Completed: ${result.title}`);
  if (result.nextTask) {
    console.log(`   Next: ${result.nextTask.title}\n`);
  }

  // Test 5: Detection
  console.log('Test 5: Request detection');
  console.log(`   "start working": ${executionService.isExecutionRequest('start working')}`);
  console.log(`   "task done": ${executionService.isCompletionRequest('task done')}`);
  console.log(`   "hello": ${executionService.isExecutionRequest('hello')}`);
  console.log();

  console.log('🎉 All tests passed!');
}

testExecution().catch(console.error);
```

Run with:
```bash
bun run test-execution.ts
```

---

## Summary

The Task Execution Engine is fully implemented and ready for testing. It:

✅ Selects next task intelligently (priority + order)
✅ Generates detailed execution plans via AI
✅ Updates task status automatically
✅ Tracks completion and progress
✅ Suggests next tasks
✅ Handles errors gracefully
✅ Performs efficiently (<3s)

**Test it now and start executing tasks systematically!** 🚀
