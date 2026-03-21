# Phase 15: Persistent & Distributed Workflow Execution Engine

## 🎯 Objective
Transform the workflow engine into a production-grade distributed system with database persistence, crash recovery, distributed worker execution, and fault tolerance.

## ✅ Completed

### 1. Database Schema (`schema.prisma`)

#### Workflow Model
```prisma
model Workflow {
  id          String   @id @default(cuid())
  userId      String
  sessionId   String
  goal        String   @db.Text
  status      String   // pending | running | paused | completed | failed
  currentStep String?
  pauseReason String?
  metadata    Json?
  createdAt   DateTime
  updatedAt   DateTime
  startedAt   DateTime?
  completedAt DateTime?
  lockedBy    String?  // Worker ID (distributed lock)
  lockedAt    DateTime?
  
  steps   WorkflowStep[]
  results WorkflowResult[]
}
```

#### WorkflowStep Model
```prisma
model WorkflowStep {
  id                String
  workflowId        String
  stepId            String   // Logical ID
  name              String
  action            String
  parameters        Json
  dependencies      Json     // Array of step IDs
  riskLevel         String
  estimatedDuration Int
  retryable         Boolean
  maxRetries        Int
  status            String   // pending | running | completed | failed | skipped
  attempts          Int
  error             String?
  output            Json?
  startedAt         DateTime?
  completedAt       DateTime?
  timeoutAt         DateTime?  // For timeout detection
}
```

#### WorkflowResult Model
```prisma
model WorkflowResult {
  id         String
  workflowId String
  stepId     String
  output     Json
  createdAt  DateTime
}
```

#### WorkflowQueue Model
```prisma
model WorkflowQueue {
  id          String
  workflowId  String
  stepId      String
  priority    Int
  retryCount  Int
  scheduledAt DateTime
}
```

### 2. Workflow Repository (`workflow.repository.ts`)

#### Core Operations

**Create Workflow**
```typescript
createWorkflow(data: CreateWorkflowData)
```
- Stores workflow and all steps in single transaction
- Returns workflow with steps included
- Atomic operation ensures consistency

**Get Workflow**
```typescript
getWorkflow(workflowId: string)
```
- Retrieves workflow with steps and results
- Ordered by creation time
- Includes all execution history

**Update Workflow**
```typescript
updateWorkflow(workflowId: string, data: UpdateWorkflowData)
```
- Updates workflow status, current step, locks
- Tracks start/completion times
- Records pause reasons

**Update Step**
```typescript
updateStep(workflowId: string, stepId: string, data: UpdateStepData)
```
- Updates step status, attempts, errors
- Stores output and timing data
- Manages timeout timestamps

**Store Result**
```typescript
storeResult(workflowId: string, stepId: string, output: any)
```
- Persists step execution results
- Separate table for query optimization
- Immutable audit trail

#### Distributed Lock System

**Lock Workflow**
```typescript
lockWorkflow(workflowId: string, workerId: string): Promise<boolean>
```
**Distributed Lock Algorithm:**
```sql
UPDATE workflows
SET lockedBy = 'worker_123', lockedAt = NOW()
WHERE id = 'workflow_id'
  AND (lockedBy IS NULL OR lockedAt < NOW() - INTERVAL '5 minutes')
```

**Features:**
- Optimistic locking with atomic UPDATE
- Lock timeout: 5 minutes (prevents deadlocks)
- Returns true if lock acquired
- Multiple workers can compete safely

**Unlock Workflow**
```typescript
unlockWorkflow(workflowId: string, workerId: string)
```
- Releases lock only if owned by worker
- Prevents accidental unlock by other workers

#### Queue Management

**Add to Queue**
```typescript
addToQueue(workflowId, stepId, priority, retryCount)
```
- Queues failed steps for retry
- Priority-based ordering
- Scheduled execution time

**Get Next Queued Item**
```typescript
getNextQueuedItem()
```
- Retrieves highest priority item
- Respects scheduled time
- FIFO within same priority

**Remove from Queue**
```typescript
removeFromQueue(queueId)
```
- Removes after successful execution
- Prevents duplicate processing

#### Utility Operations

**Get Pending Workflows**
```typescript
getPendingWorkflows(limit: number)
```
- Finds workflows ready for execution
- Excludes locked workflows (unless lock expired)
- Ordered by creation time (FIFO)

**Get Timed Out Steps**
```typescript
getTimedOutSteps()
```
- Finds steps exceeding timeout
- Includes workflow context
- Used by timeout monitor

**Cleanup Old Workflows**
```typescript
cleanupOldWorkflows(daysOld: number)
```
- Removes completed workflows older than N days
- Frees database space
- Maintains audit trail for recent workflows

**Get Statistics**
```typescript
getStatistics(userId?: string)
```
- Counts by status (pending, running, completed, failed)
- Per-user or global stats
- Dashboard metrics

### 3. Workflow Runner Service (`workflow-runner.service.ts`)

#### Architecture

**Worker Model:**
```
Worker Instance
    ├─ Unique Worker ID
    ├─ Polling Loop (5s interval)
    ├─ Timeout Monitor (30s interval)
    ├─ Queue Processor (10s interval)
    └─ Concurrent Execution (max 5 workflows)
```

#### Core Components

**1. Polling Loop**
```typescript
pollAndExecute()
```
**Flow:**
```
Every 5 seconds:
    ↓
Check available slots (max 5 concurrent)
    ↓
Fetch pending workflows from DB
    ↓
For each workflow:
    ├─ Try to acquire lock
    ├─ If locked → Add to active set
    └─ Execute asynchronously
```

**2. Workflow Execution**
```typescript
executeWorkflow(workflowId: string)
```
**Flow:**
```
Acquire Lock
    ↓
Load workflow + steps + results
    ↓
Update status to 'running'
    ↓
Resolve execution order (topological sort)
    ↓
For each step:
    ├─ Check dependencies met
    ├─ Check if should pause (risk)
    ├─ Execute with idempotency
    ├─ Handle success/failure
    └─ Store result
    ↓
Update status to 'completed'
    ↓
Release lock
```

**3. Idempotent Execution**
```typescript
executeStepIdempotent(workflowId, step, dependencies)
```
**Idempotency Guarantee:**
```
Check if step already completed
    ├─ YES → Return cached result (no re-execution)
    └─ NO → Execute step
              ↓
         Set status = 'running'
         Set timeout timestamp
              ↓
         Execute action
              ↓
         Set status = 'completed'
         Store result
              ↓
         Return result
```

**Why Idempotency Matters:**
- Worker crashes mid-execution
- Network failures
- Duplicate queue items
- Lock timeouts

**4. Timeout Monitor**
```typescript
startTimeoutMonitor()
```
**Runs every 30 seconds:**
```
Query steps with timeoutAt < NOW()
    ↓
For each timed out step:
    ├─ Mark as 'failed'
    ├─ Set error = 'Step execution timed out'
    └─ Add to retry queue (if retryable)
```

**Timeout Configuration:**
- Default: 5 minutes per step
- Configurable per step
- Prevents hung executions

**5. Queue Processor**
```typescript
startQueueProcessor()
```
**Runs every 10 seconds:**
```
Get next queued item (priority + scheduled time)
    ↓
Remove from queue
    ↓
Try to lock workflow
    ↓
If locked → Execute workflow
```

**Queue Features:**
- Priority-based (higher priority first)
- Scheduled execution (delayed retry)
- Retry count tracking

#### Failure Handling

**Step Failure Flow:**
```
Step Fails
    ↓
Mark step as 'failed'
Store error message
    ↓
Is retryable AND attempts < maxRetries?
    ├─ YES → Calculate retry delay (exponential backoff)
    │        Add to queue with scheduled time
    │        Continue workflow (if non-critical)
    └─ NO → Mark workflow as 'failed'
            Stop execution
```

**Exponential Backoff:**
```typescript
Attempt 1: 2 seconds
Attempt 2: 4 seconds
Attempt 3: 8 seconds
Max: 60 seconds
```

#### Crash Recovery

**Scenario: Worker Crashes**
```
Worker crashes while executing workflow
    ↓
Lock remains in database (lockedBy = 'crashed_worker')
    ↓
After 5 minutes (lock timeout):
    ↓
Another worker's polling loop finds workflow
    ↓
Lock is expired → Can acquire lock
    ↓
New worker resumes execution
    ↓
Idempotency ensures no duplicate work
```

**Scenario: Database Connection Lost**
```
Worker loses DB connection
    ↓
Polling loop fails
    ↓
Worker continues trying (automatic retry)
    ↓
Connection restored → Resume normal operation
```

**Scenario: Step Timeout**
```
Step runs longer than timeout
    ↓
Timeout monitor detects (timeoutAt < NOW)
    ↓
Marks step as 'failed'
    ↓
Adds to retry queue
    ↓
Worker picks up from queue
    ↓
Re-executes step (idempotent)
```

### 4. Distributed Execution

#### Multi-Worker Architecture

```
Database (PostgreSQL)
    ↑
    ├─ Worker 1 (polls every 5s)
    ├─ Worker 2 (polls every 5s)
    ├─ Worker 3 (polls every 5s)
    └─ Worker N (polls every 5s)
```

**How It Works:**
1. All workers poll same database
2. Each worker tries to lock workflows
3. Only one worker succeeds (atomic UPDATE)
4. Worker executes workflow
5. Worker releases lock when done
6. Other workers pick up remaining workflows

**Benefits:**
- Horizontal scalability
- Fault tolerance (worker failure)
- Load distribution
- No single point of failure

#### Concurrency Control

**Per-Worker Concurrency:**
```typescript
MAX_CONCURRENT_WORKFLOWS = 5
```
- Each worker executes max 5 workflows simultaneously
- Prevents resource exhaustion
- Configurable per worker

**Global Concurrency:**
```
3 workers × 5 concurrent = 15 workflows executing
```

**Lock-Based Coordination:**
- No workflow executed by multiple workers
- Database ensures atomicity
- Lock timeout prevents deadlocks

### 5. Persistence Features

#### State Persistence
```
Every state change → Database write
    ├─ Workflow status
    ├─ Current step
    ├─ Step status
    ├─ Results
    └─ Errors
```

**Benefits:**
- Survive crashes
- Resume from exact point
- Complete audit trail
- Query execution history

#### Result Storage
```
Step completes → Store in workflow_results
    ├─ Immutable record
    ├─ Separate table (performance)
    └─ Used by dependent steps
```

#### Audit Trail
```
Database contains:
    ├─ When workflow created
    ├─ When each step started
    ├─ When each step completed
    ├─ All errors encountered
    ├─ All retry attempts
    └─ Final outcome
```

## 🏗️ System Architecture

### Data Flow

```
User Request
    ↓
Plan Workflow (workflow-agent.service)
    ↓
Store in Database (workflow.repository)
    ↓
Worker Polls Database (workflow-runner.service)
    ↓
Worker Locks Workflow
    ↓
Execute Steps
    ↓
Store Results
    ↓
Release Lock
    ↓
Workflow Complete
```

### Component Interaction

```
workflow-agent.service.ts
    ├─ Plans workflows
    └─ Stores via repository
         ↓
workflow.repository.ts
    ├─ Database operations
    ├─ Lock management
    └─ Queue management
         ↓
workflow-runner.service.ts
    ├─ Polls for work
    ├─ Executes workflows
    └─ Handles failures
```

## 📊 Features Summary

| Feature | Status | Implementation |
|---------|--------|----------------|
| Database Persistence | ✅ | PostgreSQL + Prisma |
| Distributed Locks | ✅ | Atomic UPDATE with timeout |
| Crash Recovery | ✅ | Lock timeout + idempotency |
| Idempotent Execution | ✅ | Check before execute |
| Timeout Handling | ✅ | Monitor + auto-retry |
| Retry Queue | ✅ | Priority-based queue |
| Multi-Worker | ✅ | Polling + locking |
| Exponential Backoff | ✅ | 2^n seconds |
| Audit Trail | ✅ | Complete history in DB |
| Statistics | ✅ | Count by status |

## 🎮 Usage Examples

### Example 1: Create and Execute Workflow

```typescript
// 1. Plan workflow
const workflow = await workflowAgentService.planWorkflow(
  "Process user data and generate report",
  "user_123",
  "session_456"
);
// → Stored in database with status='pending'

// 2. Start worker (in separate process)
workflowRunnerService.start();
// → Worker polls database every 5s
// → Finds pending workflow
// → Locks and executes

// 3. Check status
const status = await workflowRepository.getWorkflow(workflow.id);
console.log(status.status); // 'running' → 'completed'

// 4. Get results
const results = await workflowRepository.getResults(workflow.id);
console.log(results);
```

### Example 2: Crash Recovery

```typescript
// Worker 1 starts executing workflow
workflowRunnerService.start();
// → Locks workflow_123
// → Executing step 3 of 10

// Worker 1 crashes (power failure)
// → Lock remains: { lockedBy: 'worker_1', lockedAt: '2024-01-01 10:00:00' }

// 5 minutes later...
// Worker 2 polls database
// → Finds workflow_123
// → Lock expired (lockedAt < NOW - 5 minutes)
// → Acquires lock
// → Resumes from step 3 (idempotent)
// → Completes workflow
```

### Example 3: Distributed Execution

```typescript
// Start 3 workers
// Worker 1
workflowRunnerService.start(); // worker_abc

// Worker 2
workflowRunnerService.start(); // worker_def

// Worker 3
workflowRunnerService.start(); // worker_ghi

// Create 10 workflows
for (let i = 0; i < 10; i++) {
  await workflowAgentService.planWorkflow(...);
}

// Workers distribute work:
// Worker 1: workflows 1, 4, 7, 10
// Worker 2: workflows 2, 5, 8
// Worker 3: workflows 3, 6, 9
```

### Example 4: Retry with Queue

```typescript
// Step fails (transient error)
// → Marked as 'failed'
// → Added to queue with delay

// Queue entry:
{
  workflowId: 'wf_123',
  stepId: 'step_2',
  priority: 0,
  retryCount: 1,
  scheduledAt: NOW() + 2 seconds
}

// Queue processor (10s interval):
// → Finds queued item
// → Scheduled time passed
// → Locks workflow
// → Re-executes step
// → Success → Remove from queue
```

## 🔐 Safety Mechanisms

1. **Distributed Locks**: Prevent concurrent execution
2. **Lock Timeout**: Prevent deadlocks (5 min)
3. **Idempotency**: Prevent duplicate work
4. **Timeout Detection**: Prevent hung steps
5. **Retry Limits**: Prevent infinite loops
6. **Exponential Backoff**: Reduce load on failures
7. **Transaction Safety**: Atomic database operations
8. **Worker Isolation**: Failures don't affect others

## 🚀 Performance Characteristics

### Throughput
- **Single Worker**: ~5 workflows concurrently
- **3 Workers**: ~15 workflows concurrently
- **10 Workers**: ~50 workflows concurrently

### Latency
- **Polling Interval**: 5 seconds (workflow pickup)
- **Queue Processing**: 10 seconds (retry pickup)
- **Timeout Detection**: 30 seconds (max delay)

### Scalability
- **Horizontal**: Add more workers
- **Vertical**: Increase MAX_CONCURRENT_WORKFLOWS
- **Database**: PostgreSQL connection pooling

### Resource Usage
- **Memory**: O(n) where n = active workflows
- **Database**: Indexed queries (fast lookups)
- **CPU**: Minimal (mostly I/O bound)

## 🧪 Testing Scenarios

### Test 1: Basic Execution
```typescript
const workflow = await planWorkflow(...);
workflowRunnerService.start();
await waitForCompletion(workflow.id);
expect(workflow.status).toBe('completed');
```

### Test 2: Crash Recovery
```typescript
const workflow = await planWorkflow(...);
workflowRunnerService.start();
await waitForStep(workflow.id, 'step_3');
workflowRunnerService.stop(); // Simulate crash
workflowRunnerService.start(); // New worker
await waitForCompletion(workflow.id);
expect(workflow.status).toBe('completed');
```

### Test 3: Distributed Execution
```typescript
const workflows = await Promise.all([
  planWorkflow(...),
  planWorkflow(...),
  planWorkflow(...)
]);
const worker1 = new WorkflowRunnerService();
const worker2 = new WorkflowRunnerService();
worker1.start();
worker2.start();
await waitForAllCompletion(workflows);
// Verify no duplicate execution
```

### Test 4: Idempotency
```typescript
const workflow = await planWorkflow(...);
const step = workflow.steps[0];
await executeStepIdempotent(workflow.id, step, {});
const result1 = await getStepResult(workflow.id, step.id);
await executeStepIdempotent(workflow.id, step, {}); // Re-execute
const result2 = await getStepResult(workflow.id, step.id);
expect(result1).toEqual(result2); // Same result
```

### Test 5: Timeout Handling
```typescript
const workflow = await planWorkflow(...);
const step = { ...workflow.steps[0], estimatedDuration: 100 };
await updateStep(workflow.id, step.id, { timeoutAt: new Date() });
await waitForTimeoutMonitor();
const updatedStep = await getStep(workflow.id, step.id);
expect(updatedStep.status).toBe('failed');
expect(updatedStep.error).toContain('timed out');
```

## 📝 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/orin

# Worker Settings
WORKER_POLL_INTERVAL_MS=5000
WORKER_MAX_CONCURRENT=5
WORKER_LOCK_TIMEOUT_MS=300000

# Step Settings
STEP_TIMEOUT_MS=300000
STEP_MAX_RETRIES=3

# Queue Settings
QUEUE_PROCESS_INTERVAL_MS=10000
TIMEOUT_MONITOR_INTERVAL_MS=30000
```

### Database Indexes
```sql
-- Optimize workflow queries
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_locked ON workflows(lockedBy, lockedAt);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_workflow_steps_timeout ON workflow_steps(timeoutAt);
CREATE INDEX idx_workflow_queue_scheduled ON workflow_queue(scheduledAt, priority);
```

## ✨ Key Benefits

1. **Fault Tolerant**: Survives crashes and failures
2. **Scalable**: Add workers for more throughput
3. **Persistent**: Never lose workflow state
4. **Distributed**: No single point of failure
5. **Idempotent**: Safe to retry operations
6. **Observable**: Complete execution history
7. **Recoverable**: Resume from any point
8. **Production-Ready**: Battle-tested patterns

## 🔮 Future Enhancements

- [ ] Redis for faster locking (optional)
- [ ] BullMQ for advanced queue features
- [ ] Workflow priority levels
- [ ] Step-level parallelism
- [ ] Workflow templates
- [ ] Real-time progress streaming (WebSocket)
- [ ] Workflow versioning
- [ ] Rollback capability
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Metrics dashboard (Prometheus + Grafana)
- [ ] Auto-scaling workers (Kubernetes)
- [ ] Workflow scheduling (cron)

---

**Status**: ✅ Complete
**Next Phase**: API endpoints and monitoring dashboard
