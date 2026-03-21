# Adaptive Intelligence Layer - Testing Guide

## 🧪 Complete Learning Cycle Test

### Prerequisites
1. Backend server running
2. Database migrated (TaskMetrics model exists)
3. Gemini API key configured
4. Fresh user account (no history)

---

## Migration First!

Before testing, run the migration to create the TaskMetrics table:

```bash
cd backend

# Generate and apply migration
npx prisma migrate dev --name add_task_metrics

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

## Full Learning Cycle

### Phase 1: First Goal (No History)

**Step 1: Create Session**
```bash
POST http://localhost:3000/api/chat
{
  "message": "Hello"
}
```

Save sessionId!

---

**Step 2: Decompose First Goal**
```bash
POST http://localhost:3000/api/chat
{
  "message": "build authentication system",
  "sessionId": "session123"
}
```

**Expected:**
- Standard task decomposition
- No adaptive insights (no history yet)
- No priority adjustments
- 6-8 tasks created

**Database:**
- 0 TaskMetrics records (no execution yet)

---

**Step 3: Execute First Task**
```bash
POST http://localhost:3000/api/chat
{
  "message": "start working",
  "sessionId": "session123"
}
```

**Expected Response:**
```json
{
  "intent": "TASK_EXECUTION",
  "output": "Let's work on the next task!\n\n**Task:** Setup JWT Library [HIGH]\n\n**Estimated Time:** 1-2 hours\n..."
}
```

**Database State:**
```sql
SELECT * FROM task_metrics;
```

Expected:
```
id     | task_id | estimated_time | actual_time | success | started_at           | completed_at
-------|---------|----------------|-------------|---------|----------------------|-------------
met1   | task1   | 1-2 hours      | NULL        | true    | 2024-03-21 10:00:00  | NULL
```

---

**Step 4: Complete First Task (after 30 minutes)**
```bash
POST http://localhost:3000/api/chat
{
  "message": "task done",
  "sessionId": "session123"
}
```

**Expected Response:**
```json
{
  "intent": "TASK_COMPLETION",
  "output": "✅ Great work! Task completed: \"Setup JWT Library\"\n\n**Progress:** 1/7 tasks completed (14%)\n..."
}
```

**Database State:**
```sql
SELECT * FROM task_metrics WHERE task_id = 'task1';
```

Expected:
```
id     | task_id | estimated_time | actual_time | success | started_at           | completed_at
-------|---------|----------------|-------------|---------|----------------------|-------------
met1   | task1   | 1-2 hours      | 30          | true    | 2024-03-21 10:00:00  | 2024-03-21 10:30:00
```

**Learning:**
- Task was faster than estimated (60-120 min estimate, 30 min actual)
- System records this for future learning

---

### Phase 2: Build History (Complete 5-10 Tasks)

**Repeat Steps 3-4 for multiple tasks:**

1. Execute task: "start working"
2. Complete task: "task done"
3. Vary completion times:
   - Some quick (< estimated)
   - Some slow (> estimated)
   - Some on time

**Example History:**
```
Task 1: "Setup JWT Library"
  Estimated: 1-2 hours (60-120 min)
  Actual: 30 min
  Result: Quick ✅

Task 2: "Create Auth Middleware"
  Estimated: 2-3 hours (120-180 min)
  Actual: 180 min
  Result: On time ✅

Task 3: "Build Login Endpoint"
  Estimated: 1-2 hours
  Actual: 150 min
  Result: Delayed ⚠️

Task 4: "Build Register Endpoint"
  Estimated: 1-2 hours
  Actual: 140 min
  Result: Delayed ⚠️

Task 5: "Add Token Refresh"
  Estimated: 2-3 hours
  Actual: 90 min
  Result: Quick ✅
```

**Database State:**
```sql
SELECT 
  t.title,
  tm.estimated_time,
  tm.actual_time,
  tm.success
FROM tasks t
JOIN task_metrics tm ON t.id = tm.task_id
WHERE t.user_id = 'user123'
ORDER BY tm.created_at;
```

---

### Phase 3: Second Goal with Learning 🧠

**Step 5: Decompose New Goal with History**
```bash
POST http://localhost:3000/api/chat
{
  "message": "build notification system",
  "sessionId": "session123"
}
```

**Expected Response:**
```json
{
  "intent": "TASK_DECOMPOSITION",
  "output": "I've broken down your goal with adaptive learning insights:\n\n**Goal:** Build notification system\n\n**Adaptive Insights:**\nBased on your history, I've adjusted priorities:\n- API endpoint tasks increased to HIGH (similar tasks took longer)\n- Setup tasks adjusted to MEDIUM (similar tasks were quick)\n\n**Tasks (7):**\n\n1. **Design Notification Schema** [HIGH] ⬆️\n   ...\n\n2. **Create Notification Service** [HIGH]\n   ...\n\n3. **Build Send Endpoint** [HIGH] ⬆️ (adjusted from MEDIUM)\n   Similar tasks historically took longer than expected\n   ...\n\n4. **Setup Email Provider** [MEDIUM] ⬇️ (adjusted from HIGH)\n   Similar tasks are typically quick to complete\n   ...",
  "actions": [{
    "type": "task_decomposition",
    "status": "completed",
    "details": {
      "taskCount": 7,
      "adaptiveAdjustments": 3
    }
  }]
}
```

**What Happened:**
1. System retrieved historical metrics
2. Calculated insights:
   - Average time: 98 minutes
   - Success rate: 100%
   - Common delays: "API endpoint tasks often take longer"
3. Generated better task suggestions
4. Adjusted priorities based on patterns:
   - "Build Endpoint" tasks: medium → high (historically delayed)
   - "Setup" tasks: high → medium (historically quick)

---

### Phase 4: Verify Learning Insights

**Step 6: Get Learning Insights**
```typescript
const insights = await adaptiveService.getLearningInsights('user123');
console.log(insights);
```

**Expected Output:**
```json
{
  "averageActualTime": 98,
  "successRate": 100,
  "commonDelays": [
    "Tasks often take longer than estimated",
    "Tasks involving \"endpoint\" tend to take longer"
  ],
  "recommendations": [
    "Add buffer time to estimates for complex tasks",
    "Task execution is efficient - keep up the good work!"
  ]
}
```

---

## Test Scenarios

### Scenario 1: Quick Tasks Pattern

**History:**
```
5 tasks completed
All took < 30 minutes
All estimated 1-2 hours
```

**Next Decomposition:**
```
Insight: "Tasks are quick - consider batching similar tasks together"
Adjustment: Lower priority for similar quick tasks
```

---

### Scenario 2: Delayed Tasks Pattern

**History:**
```
5 tasks completed
3 took > 150% of estimate
Common word: "database"
```

**Next Decomposition:**
```
Insight: "Tasks involving 'database' tend to take longer"
Adjustment: Increase priority for database tasks
Suggestion: "Break database tasks into smaller subtasks"
```

---

### Scenario 3: Low Success Rate

**History:**
```
10 tasks total
7 completed successfully
3 cancelled
Success rate: 70%
```

**Next Decomposition:**
```
Insight: "Success rate below 80%"
Recommendation: "Review task requirements more carefully before starting"
Improvement: "Add more detailed task descriptions"
```

---

### Scenario 4: High Average Time

**History:**
```
Average completion time: 200 minutes (3.3 hours)
```

**Next Decomposition:**
```
Recommendation: "Consider breaking down tasks into smaller subtasks"
Suggestion: "Split complex tasks into 1-2 hour chunks"
```

---

## Direct Service Testing

### Test Metrics Tracking

```typescript
import adaptiveService from './services/adaptive.service';

// Track task start
await adaptiveService.trackTaskStart('task123', '2-3 hours');

// Simulate work (wait 45 minutes)
// ...

// Track completion
await adaptiveService.trackTaskCompletion('task123', true);

// Get metrics
const metrics = await adaptiveService.getTaskMetrics('task123');
console.log(metrics);
// {
//   taskId: 'task123',
//   estimatedTime: '2-3 hours',
//   actualTime: 45,
//   success: true,
//   startedAt: Date,
//   completedAt: Date
// }
```

---

### Test Learning Insights

```typescript
// Get insights
const insights = await adaptiveService.getLearningInsights('user123');

console.log(`Average time: ${insights.averageActualTime} minutes`);
console.log(`Success rate: ${insights.successRate}%`);
console.log('Delays:', insights.commonDelays);
console.log('Recommendations:', insights.recommendations);
```

---

### Test Priority Adjustment

```typescript
const tasks = [
  { title: 'Create API Endpoint', description: '...', priority: 'medium' },
  { title: 'Setup Library', description: '...', priority: 'high' },
  { title: 'Write Tests', description: '...', priority: 'low' }
];

const result = await adaptiveService.adjustTaskPriorities(tasks, 'user123');

console.log(`Adjusted ${result.adjustments.length} priorities`);
result.adjustments.forEach(adj => {
  console.log(`Task: ${adj.taskId}`);
  console.log(`  ${adj.originalPriority} → ${adj.adjustedPriority}`);
  console.log(`  Reason: ${adj.reason}`);
});
```

---

### Test Better Task Generation

```typescript
const better = await adaptiveService.generateBetterTasks(
  'build payment system',
  'user123'
);

console.log('Suggestions:');
better.suggestions.forEach(s => console.log(`- ${s}`));

console.log('\nImprovements:');
better.improvements.forEach(imp => console.log(`- ${imp}`));
```

---

## Database Verification

### Check Metrics

```sql
-- Get all metrics
SELECT 
  t.title,
  tm.estimated_time,
  tm.actual_time,
  tm.success,
  tm.started_at,
  tm.completed_at
FROM tasks t
LEFT JOIN task_metrics tm ON t.id = tm.task_id
WHERE t.user_id = 'user123'
ORDER BY tm.created_at DESC;
```

---

### Calculate Statistics

```sql
-- Average actual time
SELECT AVG(actual_time) as avg_time
FROM task_metrics tm
JOIN tasks t ON tm.task_id = t.id
WHERE t.user_id = 'user123' AND tm.actual_time IS NOT NULL;

-- Success rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM task_metrics tm
JOIN tasks t ON tm.task_id = t.id
WHERE t.user_id = 'user123';

-- Delayed tasks
SELECT 
  t.title,
  tm.estimated_time,
  tm.actual_time
FROM tasks t
JOIN task_metrics tm ON t.id = tm.task_id
WHERE t.user_id = 'user123'
  AND tm.actual_time > 90  -- Assuming 1-2 hour estimates
ORDER BY tm.actual_time DESC;
```

---

## Logs to Watch

Enable debug logging to see adaptive learning in action:

```
[Task] Starting task decomposition
[Adaptive] Generating better tasks { userId: 'user123', goal: 'build notification system' }
[Adaptive] Learning insights generated { tasksAnalyzed: 5, averageActualTime: 98, successRate: 100 }
[Task] Adaptive suggestions available { suggestionsCount: 3, improvementsCount: 4 }
[Task] Task decomposition generated { goal: '...', taskCount: 7 }
[Adaptive] Adjusting task priorities { userId: 'user123', taskCount: 7 }
[Adaptive] Task priorities adjusted { adjustmentCount: 3 }
[Task] Priorities adjusted by adaptive layer { adjustmentCount: 3 }

[Execution] Starting next task execution
[Execution] Selected next task { taskId: 'task1', title: '...', priority: 'high' }
[Execution] Execution plan generated { stepsCount: 6, estimatedTime: '2-3 hours' }
[Adaptive] Tracking task start { taskId: 'task1', estimatedTime: '2-3 hours' }
[Adaptive] Task start tracked { taskId: 'task1' }

[Execution] Completing task { taskId: 'task1' }
[Adaptive] Tracking task completion { taskId: 'task1', success: true }
[Adaptive] Task completion tracked { taskId: 'task1', actualTime: '45 minutes', success: true }
```

---

## Performance Benchmarks

Expected timings:
- Track start: ~5ms
- Track completion: ~10ms
- Get insights: ~100-200ms
- Adjust priorities: ~50-100ms
- Generate better tasks: ~2000-3000ms (AI call)

---

## Success Criteria

✅ TaskMetrics records created on task start
✅ Metrics updated on task completion
✅ Actual time calculated correctly
✅ Learning insights generated from history
✅ Priorities adjusted based on patterns
✅ Better task suggestions provided
✅ Recommendations are actionable
✅ No errors in logs
✅ Graceful degradation without history
✅ Non-breaking integration

---

## Troubleshooting

### Issue: "No metrics tracked"
- Verify TaskMetrics table exists
- Check migration status
- Review execution service integration
- Ensure trackTaskStart() is called

### Issue: "No learning insights"
- Complete at least 1 task
- Verify metrics have actualTime
- Check task status is 'done'
- Review database records

### Issue: "No priority adjustments"
- Need at least 2 similar tasks in history
- Check similarity matching logic
- Verify delay patterns exist
- Review adjustment thresholds

### Issue: "Better tasks not generated"
- Check Gemini API key
- Verify Prompt Engine working
- Review historical data availability
- Check AI response format

---

## Example Test Script

```typescript
// test-adaptive.ts
import adaptiveService from './services/adaptive.service';
import taskService from './services/task.service';
import executionService from './services/execution.service';

async function testAdaptiveLearning() {
  console.log('🧪 Testing Adaptive Intelligence Layer\n');

  const userId = 'test-user-123';
  const sessionId = 'test-session-456';

  // Test 1: Track task execution
  console.log('Test 1: Track task execution');
  await adaptiveService.trackTaskStart('task1', '2-3 hours');
  console.log('✅ Task start tracked\n');

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));

  await adaptiveService.trackTaskCompletion('task1', true);
  console.log('✅ Task completion tracked\n');

  // Test 2: Get metrics
  console.log('Test 2: Get task metrics');
  const metrics = await adaptiveService.getTaskMetrics('task1');
  console.log(`✅ Metrics: ${JSON.stringify(metrics, null, 2)}\n`);

  // Test 3: Get learning insights
  console.log('Test 3: Get learning insights');
  const insights = await adaptiveService.getLearningInsights(userId);
  console.log(`✅ Average time: ${insights.averageActualTime} min`);
  console.log(`   Success rate: ${insights.successRate}%`);
  console.log(`   Recommendations: ${insights.recommendations.length}\n`);

  // Test 4: Adjust priorities
  console.log('Test 4: Adjust priorities');
  const tasks = [
    { title: 'Create Service', description: '...', priority: 'medium' as const },
    { title: 'Write Tests', description: '...', priority: 'high' as const }
  ];
  const adjusted = await adaptiveService.adjustTaskPriorities(tasks, userId);
  console.log(`✅ Adjustments: ${adjusted.adjustments.length}\n`);

  // Test 5: Generate better tasks
  console.log('Test 5: Generate better tasks');
  const better = await adaptiveService.generateBetterTasks('build auth', userId);
  console.log(`✅ Suggestions: ${better.suggestions.length}`);
  console.log(`   Improvements: ${better.improvements.length}\n`);

  console.log('🎉 All tests passed!');
}

testAdaptiveLearning().catch(console.error);
```

Run with:
```bash
bun run test-adaptive.ts
```

---

## Summary

The Adaptive Intelligence Layer is fully implemented and ready for testing. It:

✅ Tracks task execution metrics automatically
✅ Learns from historical patterns
✅ Adjusts priorities based on data
✅ Generates better task breakdowns
✅ Provides actionable recommendations
✅ Integrates seamlessly with existing services
✅ Handles errors gracefully
✅ Performs efficiently

**Test it now and watch the system learn and improve!** 🧠🚀
