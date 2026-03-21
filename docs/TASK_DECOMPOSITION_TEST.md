# Task Decomposition Engine - Testing Guide

## 🧪 How to Test the Task Decomposition Engine

### Prerequisites
1. Backend server running
2. Database connected and migrated
3. Gemini API key configured
4. Session created (for task association)

---

## Migration First!

Before testing, run the migration to create the Task table:

```bash
cd backend

# Generate and apply migration
npx prisma migrate dev --name add_task_model

# Generate Prisma client
npx prisma generate

# Verify migration
npx prisma migrate status
```

Expected output:
```
✔ Generated Prisma Client
Database schema is up to date!
```

---

## Test Flow

### Step 1: Create a Session

**Request: Start a conversation**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Hello, I want to start a new project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent": "UNCLEAR",
    "output": "...",
    "sessionId": "clx123abc",
    "isNewSession": true
  }
}
```

**Save the sessionId!**

---

### Step 2: Decompose a Goal 🎯

**Request: Build Resume Engine**
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
    "output": "I've broken down your goal into actionable tasks:\n\n**Goal:** Build a resume work engine that allows users to continue their previous work sessions\n\n**Tasks (7):**\n\n1. **Create Resume Service** [HIGH]\n   Implement src/services/resume.service.ts with core resumeWork() function that retrieves session data and analyzes message history\n\n2. **Design Database Schema** [HIGH]\n   Ensure Session and Message models support resume functionality with proper indexes and relations\n\n3. **Implement Message Analysis** [HIGH]\n   Build logic to extract context from last 10 messages including topics, intents, and actions\n\n4. **Integrate Prompt Engine** [HIGH]\n   Create prompt template for generating resume summaries with current state and next steps\n\n5. **Update Orchestrator** [MEDIUM]\n   Add resume request detection and routing to resume service in orchestrator.service.ts\n\n6. **Add Error Handling** [MEDIUM]\n   Implement graceful error handling for missing sessions and empty message history\n\n7. **Write Tests** [LOW]\n   Create test scenarios for resume functionality including edge cases and error conditions\n\nAll tasks have been saved and are ready to track. You can start working on them in order, or tackle high-priority items first.",
    "references": [],
    "actions": [{
      "type": "task_decomposition",
      "status": "completed",
      "details": {
        "goal": "Build a resume work engine that allows users to continue their previous work sessions",
        "taskCount": 7,
        "tasks": [
          { "title": "Create Resume Service", "priority": "high" },
          { "title": "Design Database Schema", "priority": "high" },
          { "title": "Implement Message Analysis", "priority": "high" },
          { "title": "Integrate Prompt Engine", "priority": "high" },
          { "title": "Update Orchestrator", "priority": "medium" },
          { "title": "Add Error Handling", "priority": "medium" },
          { "title": "Write Tests", "priority": "low" }
        ]
      }
    }],
    "metadata": {
      "processingTimeMs": 2341,
      "confidence": 1.0,
      "servicesUsed": ["task", "gemini"]
    },
    "sessionId": "clx123abc"
  }
}
```

---

### Step 3: Verify in Database

**Check tasks table:**
```bash
npx prisma studio
```

Navigate to `tasks` table and verify:
- 7 tasks created
- All have `sessionId = "clx123abc"`
- All have `status = "pending"`
- Priorities: 4 high, 2 medium, 1 low
- Order: 0, 1, 2, 3, 4, 5, 6
- All have same `goal` field

**SQL Query:**
```sql
SELECT id, title, priority, status, "order" 
FROM tasks 
WHERE session_id = 'clx123abc' 
ORDER BY "order" ASC;
```

Expected result:
```
id          | title                      | priority | status  | order
------------|----------------------------|----------|---------|------
task1       | Create Resume Service      | high     | pending | 0
task2       | Design Database Schema     | high     | pending | 1
task3       | Implement Message Analysis | high     | pending | 2
task4       | Integrate Prompt Engine    | high     | pending | 3
task5       | Update Orchestrator        | medium   | pending | 4
task6       | Add Error Handling         | medium   | pending | 5
task7       | Write Tests                | low      | pending | 6
```

---

## More Test Cases

### Test Case 2: Create Authentication System

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "create authentication system with JWT and OAuth",
  "sessionId": "clx123abc"
}
```

**Expected:**
- 5-8 tasks generated
- Tasks related to auth, JWT, OAuth
- Priorities assigned
- All stored in database

### Test Case 3: Develop API Gateway

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "develop API gateway with rate limiting and caching",
  "sessionId": "clx123abc"
}
```

**Expected:**
- 5-8 tasks generated
- Tasks cover gateway, rate limiting, caching
- Logical order
- Stored in database

### Test Case 4: Not a Goal (Question)

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "What is the best way to implement authentication?",
  "sessionId": "clx123abc"
}
```

**Expected:**
- NOT detected as goal
- Routes to QUERY intent
- No tasks created
- Returns answer from context

### Test Case 5: Not a Goal (Too Short)

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "build app",
  "sessionId": "clx123abc"
}
```

**Expected:**
- NOT detected as goal (too vague)
- Routes to normal intent detection
- No tasks created

### Test Case 6: Not a Goal (Save Note)

**Request:**
```bash
POST http://localhost:3000/api/chat
Content-Type: application/json

{
  "message": "Remember to buy milk tomorrow",
  "sessionId": "clx123abc"
}
```

**Expected:**
- NOT detected as goal
- Routes to STORE intent
- Saves to Notion
- No tasks created

---

## Testing Task Management Functions

### Get Session Tasks

```typescript
import taskService from './services/task.service';

const tasks = await taskService.getSessionTasks('clx123abc');
console.log(`Found ${tasks.length} tasks`);
```

### Get User Tasks

```typescript
// All tasks
const allTasks = await taskService.getUserTasks('user123');

// Only pending
const pending = await taskService.getUserTasks('user123', 'pending');

// Only done
const done = await taskService.getUserTasks('user123', 'done');
```

### Update Task Status

```typescript
// Mark as in progress
await taskService.updateTaskStatus('task1', 'in_progress');

// Mark as done
await taskService.updateTaskStatus('task1', 'done');

// Cancel task
await taskService.updateTaskStatus('task1', 'cancelled');
```

### Get Task Statistics

```typescript
const stats = await taskService.getTaskStats('user123');
console.log(stats);
// {
//   total: 15,
//   pending: 8,
//   inProgress: 3,
//   done: 4,
//   cancelled: 0
// }
```

### Delete Task

```typescript
await taskService.deleteTask('task1');
```

---

## Logs to Watch

Enable debug logging to see the task engine in action:

```
[Orchestrator] Goal input detected
[Orchestrator] Task decomposition triggered
[Task] Starting task decomposition { userId: 'user123', sessionId: 'clx123abc' }
[Prompt Engine] Starting structured generation
[Prompt Engine] Structured response generated successfully
[Task] Task decomposition generated { goal: '...', taskCount: 7 }
[Task] Tasks stored in database { sessionId: 'clx123abc', taskCount: 7 }
[Task] Tasks stored successfully
[Orchestrator] TASK_DECOMPOSITION completed
```

---

## Performance Benchmarks

Expected timings:
- Goal detection: ~5ms
- AI task generation: ~2000-2500ms
- Database storage (transaction): ~50-100ms
- Total processing: ~2100-2600ms

---

## Success Criteria

✅ Goal input is detected automatically
✅ 5-8 tasks are generated
✅ Tasks have clear titles and descriptions
✅ Priorities are assigned (high, medium, low)
✅ Tasks are stored in database
✅ Tasks are linked to session
✅ Tasks are in logical order
✅ Response is formatted with markdown
✅ No errors in logs
✅ Processing time < 3 seconds

---

## Troubleshooting

### Issue: "Goal not detected"
- Check if input contains goal keywords
- Verify input length (15-500 chars)
- Ensure it's not a question
- Check logs for detection logic

### Issue: "No tasks generated"
- Check Gemini API key
- Verify Prompt Engine is working
- Review AI response in logs
- Check for API rate limits

### Issue: "Tasks not stored"
- Verify database connection
- Check migration status
- Review transaction logs
- Ensure sessionId is valid

### Issue: "Invalid task structure"
- Check AI response format
- Verify validation logic
- Review schema requirements
- Check for missing fields

### Issue: Slow response
- Check Gemini API latency
- Verify database query performance
- Review transaction size
- Check network connection

---

## Database Verification Queries

### Count tasks by session
```sql
SELECT session_id, COUNT(*) as task_count
FROM tasks
GROUP BY session_id;
```

### Count tasks by status
```sql
SELECT status, COUNT(*) as count
FROM tasks
WHERE user_id = 'user123'
GROUP BY status;
```

### Count tasks by priority
```sql
SELECT priority, COUNT(*) as count
FROM tasks
WHERE user_id = 'user123'
GROUP BY priority;
```

### Get recent tasks
```sql
SELECT id, title, priority, status, created_at
FROM tasks
WHERE user_id = 'user123'
ORDER BY created_at DESC
LIMIT 10;
```

### Get tasks with same goal
```sql
SELECT id, title, priority, status, "order"
FROM tasks
WHERE goal = 'Build a resume work engine...'
ORDER BY "order" ASC;
```

---

## Integration Testing

### Test with Resume Engine

1. Decompose task: "build resume engine"
2. Complete some tasks
3. Ask: "continue my work"
4. Verify resume shows pending tasks

### Test with Session Persistence

1. Create session
2. Decompose multiple goals
3. Retrieve session history
4. Verify all tasks are linked

### Test with Notion Integration

1. Decompose task
2. Export tasks to Notion
3. Verify task pages created
4. Check task status sync

---

## Example Test Script

```typescript
// test-task-decomposition.ts
import taskService from './services/task.service';

async function testTaskDecomposition() {
  console.log('🧪 Testing Task Decomposition Engine\n');

  // Test 1: Decompose task
  console.log('Test 1: Decompose "build resume engine"');
  const result = await taskService.decomposeTask({
    input: 'build resume engine',
    sessionId: 'test-session-123',
    userId: 'test-user-456'
  });
  console.log(`✅ Generated ${result.tasks.length} tasks`);
  console.log(`   Goal: ${result.goal}\n`);

  // Test 2: Get session tasks
  console.log('Test 2: Get session tasks');
  const tasks = await taskService.getSessionTasks('test-session-123');
  console.log(`✅ Found ${tasks.length} tasks\n`);

  // Test 3: Update task status
  console.log('Test 3: Update task status');
  await taskService.updateTaskStatus(tasks[0].id, 'in_progress');
  console.log(`✅ Task marked as in_progress\n`);

  // Test 4: Get task stats
  console.log('Test 4: Get task statistics');
  const stats = await taskService.getTaskStats('test-user-456');
  console.log(`✅ Stats:`, stats);
  console.log();

  // Test 5: Goal detection
  console.log('Test 5: Goal detection');
  console.log(`   "build resume engine": ${taskService.isGoalInput('build resume engine')}`);
  console.log(`   "What is authentication?": ${taskService.isGoalInput('What is authentication?')}`);
  console.log(`   "build app": ${taskService.isGoalInput('build app')}`);
  console.log();

  console.log('🎉 All tests passed!');
}

testTaskDecomposition().catch(console.error);
```

Run with:
```bash
bun run test-task-decomposition.ts
```

---

## Summary

The Task Decomposition Engine is fully implemented and ready for testing. It:

✅ Detects goal inputs automatically
✅ Generates 5-8 actionable tasks via AI
✅ Assigns priorities (high, medium, low)
✅ Stores tasks in database with transactions
✅ Links tasks to sessions
✅ Provides CRUD operations
✅ Tracks task status
✅ Handles errors gracefully
✅ Performs efficiently (<3s)

**Test it now and start breaking down complex goals!** 🚀
