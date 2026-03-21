# PHASE 10: Task Execution Engine

## 🎯 Overview

The Task Execution Engine provides intelligent task execution planning and tracking. It automatically selects the next task based on priority and order, generates detailed execution plans using AI, and tracks task completion progress.

**User Experience:**
```
User: "start working" OR "do next task"

System: Selects next task → Generates execution plan → Marks in progress → Returns detailed steps
```

---

## 🏗️ Architecture

### Core Components

1. **Execution Service** (`src/services/execution.service.ts`)
   - Next task selection logic
   - Execution plan generation
   - Task status management
   - Progress tracking
   - Completion handling

2. **Orchestrator Integration** (`src/services/orchestrator.service.ts`)
   - Execution request detection
   - Completion request detection
   - Response formatting

3. **Task Service Integration**
   - Leverages existing task CRUD operations
   - Status updates (pending → in_progress → done)
   - Session-based task retrieval

---

## 🔧 Implementation Details

### 1. Execution Service

**File:** `backend/src/services/execution.service.ts`

#### Key Functions

##### `executeNextTask(input: ExecuteNextTaskInput)`
Main entry point for task execution.

**Input:**
```typescript
{
  sessionId: string;
  userId: string;
}
```

**Flow:**
```
1. Get Session Tasks
   ↓
2. Filter Pending Tasks
   ↓
3. Select Next Task (priority + order)
   ↓
4. Generate Execution Plan (via Prompt Engine)
   ↓
5. Update Status to in_progress
   ↓
6. Return Execution Plan
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

##### `selectNextTask(pendingTasks: StoredTask[])`
Selects the next task to execute using priority and order.

**Selection Logic:**
```typescript
Priority Weights:
- high: 3
- medium: 2
- low: 1

Sort Order:
1. Priority (descending) - higher priority first
2. Order (ascending) - lower order first

Example:
Tasks: [
  { priority: 'medium', order: 2 },
  { priority: 'high', order: 5 },
  { priority: 'high', order: 1 },
  { priority: 'low', order: 0 }
]

Selected: { priority: 'high', order: 1 }
```

##### `generateExecutionPlan(task: StoredTask)`
Uses Prompt Engine to generate detailed execution plan.

**Prompt Design:**
```
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

**Schema:**
```typescript
{
  approach: 'string',
  steps: 'array',
  estimatedTime: 'string',
  risks: 'array'
}
```

**Temperature:** 0.7

##### `completeTask(taskId: string, userId: string)`
Marks a task as done and suggests next task.

**Flow:**
```
1. Verify task belongs to user
   ↓
2. Check task is not already done
   ↓
3. Update status to 'done'
   ↓
4. Get next pending task from session
   ↓
5. Return completion result with next task
```

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

##### `getCurrentTask(sessionId: string)`
Gets the current in-progress task for a session.

**Returns:** `StoredTask | null`

##### `cancelTask(taskId: string, userId: string)`
Cancels a task (sets status to 'cancelled').

##### `getExecutionProgress(sessionId: string)`
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

##### `isExecutionRequest(input: string)`
Detects if user wants to start working on next task.

**Keywords:**
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

##### `isCompletionRequest(input: string)`
Detects if user wants to mark task as complete.

**Keywords:**
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

### 2. Orchestrator Integration

**Changes to:** `backend/src/services/orchestrator.service.ts`

#### Execution Request Detection
```typescript
// Check if this is a task execution request
if (executionService.isExecutionRequest(input) && sessionId) {
  logger.info('[Orchestrator] Task execution request detected');
  return await this.handleTaskExecution(userId, sessionId, servicesUsed, startTime);
}
```

#### Completion Request Detection
```typescript
// Check if this is a task completion request
if (executionService.isCompletionRequest(input) && sessionId) {
  logger.info('[Orchestrator] Task completion request detected');
  return await this.handleTaskCompletion(userId, sessionId, servicesUsed, startTime);
}
```

#### Task Execution Handler
```typescript
private async handleTaskExecution(
  userId: string,
  sessionId: string,
  servicesUsed: string[],
  startTime: number
): Promise<OrchestratorResponse>
```

**Output Format:**
```markdown
Let's work on the next task!

**Task:** [Task Title] [PRIORITY]

**Description:** [Task description]

**Approach:**
[Overall approach]

**Steps to Complete:**
1. [Step 1]
2. [Step 2]
...

**Estimated Time:** [time estimate]

**Potential Risks:**
⚠️ [Risk 1]
⚠️ [Risk 2]

The task is now marked as "in progress". Let me know when you're done!
```

#### Task Completion Handler
```typescript
private async handleTaskCompletion(
  userId: string,
  sessionId: string,
  servicesUsed: string[],
  startTime: number
): Promise<OrchestratorResponse>
```

**Output Format:**
```markdown
✅ Great work! Task completed: "[Task Title]"

**Progress:** X/Y tasks completed (Z%)

**Next Task:** [Next Task Title] [PRIORITY]

Ready to continue? Just say "start working" or "next task"!
```

---

## 📊 Data Flow

### Task Execution Flow

```
User Input: "start working"
         ↓
Orchestrator detects execution request
         ↓
Execution Service
         ↓
┌─────────────────────────────────┐
│ 1. Get Session Tasks             │
│    - taskService.getSessionTasks │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 2. Filter Pending Tasks          │
│    - status === 'pending'        │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 3. Select Next Task              │
│    - Sort by priority            │
│    - Then by order               │
│    - Pick first                  │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 4. Generate Execution Plan       │
│    - Call Prompt Engine          │
│    - Get approach, steps, risks  │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 5. Update Task Status            │
│    - Set to 'in_progress'        │
└─────────────────────────────────┘
         ↓
Return Execution Plan to User
```

### Task Completion Flow

```
User Input: "task done"
         ↓
Orchestrator detects completion request
         ↓
Execution Service
         ↓
┌─────────────────────────────────┐
│ 1. Get Current Task              │
│    - Find in_progress task       │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 2. Complete Task                 │
│    - Update status to 'done'     │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 3. Get Next Task                 │
│    - Find next pending task      │
│    - Apply priority logic        │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 4. Get Progress                  │
│    - Calculate completion %      │
│    - Count by status             │
└─────────────────────────────────┘
         ↓
Return Completion Result to User
```

---

## 🧪 Testing

### Test Scenario 1: Execute Next Task

**Setup:**
1. Decompose goal: "build resume engine"
2. 7 tasks created (4 high, 2 medium, 1 low)

**Request:**
```
User: "start working"
```

**Expected Output:**
```
Let's work on the next task!

**Task:** Create Resume Service [HIGH]

**Description:** Implement src/services/resume.service.ts with core resumeWork() function that retrieves session data and analyzes message history

**Approach:**
Start by defining the service interface and core data structures, then implement the session retrieval logic, followed by message analysis and context extraction, and finally integrate with the Prompt Engine for summary generation.

**Steps to Complete:**
1. Create resume.service.ts file with TypeScript interfaces
2. Implement getSessionData() to retrieve session from database
3. Build analyzeMessages() to extract topics and intents
4. Create extractKeywords() helper for topic identification
5. Implement generateResumeSummary() using Prompt Engine
6. Add isResumeRequest() detection logic
7. Write comprehensive error handling

**Estimated Time:** 3-4 hours

**Potential Risks:**
⚠️ Session data might be incomplete or missing
⚠️ Message analysis could be slow with large histories
⚠️ Prompt Engine might fail to generate valid summaries

The task is now marked as "in progress". Let me know when you're done!
```

**Database State:**
- Task status changed from 'pending' to 'in_progress'

### Test Scenario 2: Complete Task

**Request:**
```
User: "task done"
```

**Expected Output:**
```
✅ Great work! Task completed: "Create Resume Service"

**Progress:** 1/7 tasks completed (14%)

**Next Task:** Design Database Schema [HIGH]

Ready to continue? Just say "start working" or "next task"!
```

**Database State:**
- Previous task status: 'done'
- Next task still: 'pending'

### Test Scenario 3: Continue Execution

**Request:**
```
User: "next task"
```

**Expected Output:**
```
Let's work on the next task!

**Task:** Design Database Schema [HIGH]

**Description:** Ensure Session and Message models support resume functionality with proper indexes and relations

**Approach:**
Review current Prisma schema, identify required changes for resume functionality, add necessary fields and indexes, then generate and apply migration.

**Steps to Complete:**
1. Review current Session and Message models in schema.prisma
2. Add optional title and summary fields to Session
3. Ensure Message model has intent and metadata fields
4. Add indexes on sessionId and createdAt for performance
5. Generate Prisma migration with descriptive name
6. Apply migration to database
7. Verify schema changes in Prisma Studio

**Estimated Time:** 1-2 hours

**Potential Risks:**
⚠️ Migration might conflict with existing data
⚠️ Indexes could slow down write operations
⚠️ Schema changes require database downtime

The task is now marked as "in progress". Let me know when you're done!
```

### Test Scenario 4: All Tasks Complete

**Setup:**
- Complete all 7 tasks

**Request:**
```
User: "task done"
```

**Expected Output:**
```
✅ Great work! Task completed: "Write Tests"

**Progress:** 7/7 tasks completed (100%)

🎉 All tasks completed! You've finished all pending tasks for this session.
```

### Test Scenario 5: No Tasks Available

**Request:**
```
User: "start working"
```

**Expected Output:**
```
No pending tasks found. All tasks are completed or in progress.
```

### Test Scenario 6: No Task in Progress

**Request:**
```
User: "task done"
```

**Expected Output:**
```
No task is currently in progress. Use "start working" or "next task" to begin a new task.
```

---

## 🔍 Key Features

### ✅ Intelligent Task Selection
- Priority-based selection (high > medium > low)
- Order-based sequencing
- Automatic next task suggestion

### ✅ AI-Powered Execution Plans
- Detailed approach description
- 3-7 actionable steps
- Realistic time estimates
- Risk identification

### ✅ Status Management
- Automatic status updates
- In-progress tracking
- Completion handling
- Cancellation support

### ✅ Progress Tracking
- Task completion percentage
- Status breakdown
- Current task identification
- Session-based progress

### ✅ Natural Language Detection
- Multiple execution keywords
- Multiple completion keywords
- Case-insensitive matching

---

## 🚀 Usage

### Execute Next Task

```typescript
const plan = await executionService.executeNextTask({
  sessionId: 'session123',
  userId: 'user456'
});

console.log(`Working on: ${plan.task.title}`);
console.log(`Steps: ${plan.steps.length}`);
console.log(`Time: ${plan.estimatedTime}`);
```

### Complete Task

```typescript
const result = await executionService.completeTask('task123', 'user456');

console.log(`Completed: ${result.title}`);
if (result.nextTask) {
  console.log(`Next: ${result.nextTask.title}`);
}
```

### Get Current Task

```typescript
const current = await executionService.getCurrentTask('session123');

if (current) {
  console.log(`Currently working on: ${current.title}`);
}
```

### Get Progress

```typescript
const progress = await executionService.getExecutionProgress('session123');

console.log(`Progress: ${progress.percentComplete}%`);
console.log(`Done: ${progress.done}/${progress.total}`);
```

### Cancel Task

```typescript
await executionService.cancelTask('task123', 'user456');
```

---

## 📈 Performance

### Metrics
- **Average Processing Time:** 2-3 seconds
- **Database Queries:** 2-3 (get tasks, update status)
- **AI Calls:** 1 (Gemini via Prompt Engine)
- **Task Selection:** O(n log n) sorting

### Optimization
- Indexed database queries
- Efficient sorting algorithm
- Cached task lists
- Minimal AI calls

---

## 🔐 Security

### Access Control
- Verifies task belongs to user
- Session validation
- User ownership checks

### Data Validation
- Task existence verification
- Status validation
- Completion checks

---

## 🎨 Output Format

### Execution Plan Format

```markdown
Let's work on the next task!

**Task:** [Title] [PRIORITY]

**Description:** [Description]

**Approach:**
[Approach text]

**Steps to Complete:**
1. [Step 1]
2. [Step 2]
...

**Estimated Time:** [Time]

**Potential Risks:**
⚠️ [Risk 1]
⚠️ [Risk 2]

The task is now marked as "in progress". Let me know when you're done!
```

### Completion Format

```markdown
✅ Great work! Task completed: "[Title]"

**Progress:** X/Y tasks completed (Z%)

**Next Task:** [Next Title] [PRIORITY]

Ready to continue? Just say "start working" or "next task"!
```

---

## 🔄 Future Enhancements

### Potential Improvements
1. **Time Tracking:** Actual time spent vs estimated
2. **Task Dependencies:** Block tasks until prerequisites done
3. **Parallel Execution:** Work on multiple tasks simultaneously
4. **Smart Scheduling:** Suggest optimal task order
5. **Collaboration:** Assign tasks to team members
6. **Notifications:** Remind about in-progress tasks
7. **Task Templates:** Reusable execution plans
8. **Learning:** Improve estimates based on history
9. **Integration:** Link to GitHub issues, Jira, etc.
10. **Automation:** Auto-execute simple tasks

---

## 🧩 Integration Points

### With Task Decomposition
- Uses tasks created by decomposition
- Maintains task order and priority
- Respects task structure

### With Resume Engine
- Shows current task in resume
- Includes progress in context
- Suggests continuing current task

### With Session System
- Session-based task execution
- Conversation context preserved
- Progress tracked per session

### With Notion
- Export execution plans
- Sync task status
- Create task pages with steps

---

## 📊 Example Prompt Engineering

### Input Task
```
Title: "Create Resume Service"
Description: "Implement src/services/resume.service.ts with core resumeWork() function"
Priority: "high"
```

### System Prompt
```
You are a technical execution planner. Create a detailed execution plan.

Task Title: "Create Resume Service"
Task Description: "Implement src/services/resume.service.ts with core resumeWork() function"
Priority: high

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

### AI Response
```json
{
  "approach": "Start by defining the service interface and core data structures, then implement the session retrieval logic, followed by message analysis and context extraction, and finally integrate with the Prompt Engine for summary generation.",
  "steps": [
    "Create resume.service.ts file with TypeScript interfaces",
    "Implement getSessionData() to retrieve session from database",
    "Build analyzeMessages() to extract topics and intents",
    "Create extractKeywords() helper for topic identification",
    "Implement generateResumeSummary() using Prompt Engine",
    "Add isResumeRequest() detection logic",
    "Write comprehensive error handling"
  ],
  "estimatedTime": "3-4 hours",
  "risks": [
    "Session data might be incomplete or missing",
    "Message analysis could be slow with large histories",
    "Prompt Engine might fail to generate valid summaries"
  ]
}
```

---

## ✨ What Makes This Production-Grade

✅ **Intelligent Selection:** Priority + order-based task selection
✅ **AI-Powered Plans:** Detailed execution plans via Prompt Engine
✅ **Status Tracking:** Automatic status management
✅ **Progress Monitoring:** Real-time progress calculation
✅ **Error Handling:** Comprehensive error messages
✅ **Type Safety:** Full TypeScript types
✅ **Validation:** Structure and status validation
✅ **Logging:** Detailed operation logs
✅ **Performance:** Efficient queries and sorting
✅ **Security:** User ownership verification
✅ **Natural Language:** Multiple keyword detection
✅ **Integration:** Seamless orchestrator integration

---

## 🎯 Summary

The Task Execution Engine successfully implements:

✅ Intelligent next task selection (priority + order)
✅ AI-powered execution plan generation
✅ Automatic status management (pending → in_progress → done)
✅ Task completion with next task suggestion
✅ Progress tracking and statistics
✅ Natural language request detection
✅ Comprehensive error handling
✅ Production-ready logging

**Result:** Users can now execute tasks systematically with AI-generated execution plans, automatic status tracking, and intelligent next task suggestions.

---

## 🔗 Related Phases

- **PHASE 7:** Session Persistence (provides session context)
- **PHASE 8:** Resume Work Engine (shows current task)
- **PHASE 9:** Task Decomposition (creates tasks to execute)

The Task Execution Engine completes the task management lifecycle: decompose → execute → track → complete.
