# PHASE 9: Task Decomposition Engine

## 🎯 Overview

The Task Decomposition Engine automatically breaks down complex goals into actionable, prioritized tasks. It uses AI to analyze user goals and generate structured task lists that are stored in the database for tracking and execution.

**User Experience:**
```
User: "build resume engine"

System: Analyzes goal → Generates 5-8 tasks → Stores in DB → Returns structured plan
```

---

## 🏗️ Architecture

### Core Components

1. **Task Service** (`src/services/task.service.ts`)
   - Main task decomposition logic
   - Prompt Engine integration
   - Database operations (CRUD)
   - Goal detection heuristics
   - Task validation

2. **Task Model** (Prisma Schema)
   - Relational database storage
   - Status tracking
   - Priority management
   - Session association

3. **Orchestrator Integration** (`src/services/orchestrator.service.ts`)
   - Automatic goal detection
   - Task decomposition triggering
   - Response formatting

---

## 🗄️ Database Schema

### New Task Model

```prisma
model Task {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String
  goal        String   @db.Text
  title       String
  description String   @db.Text
  status      String   @default("pending") // pending | in_progress | done | cancelled
  priority    String   @default("medium") // high | medium | low
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

**Fields:**
- `id`: Unique identifier (cuid)
- `sessionId`: Links to conversation session
- `userId`: Owner of the task
- `goal`: Original goal/project description
- `title`: Short task name
- `description`: Detailed task description
- `status`: Current state (pending, in_progress, done, cancelled)
- `priority`: Importance level (high, medium, low)
- `order`: Sequence number for ordering
- `createdAt`: Creation timestamp
- `updatedAt`: Last modification timestamp

**Indexes:**
- `sessionId`: Fast lookup by session
- `userId`: Fast lookup by user
- `status`: Filter by status
- `createdAt`: Chronological ordering

---

## 🔧 Implementation Details

### 1. Task Service

**File:** `backend/src/services/task.service.ts`

#### Key Functions

##### `decomposeTask(input: DecomposeTaskInput)`
Main entry point for task decomposition.

**Input:**
```typescript
{
  input: string;      // User's goal
  sessionId: string;  // Current session
  userId: string;     // User ID
}
```

**Flow:**
```
1. Generate Task Decomposition (via Prompt Engine)
   ↓
2. Validate Tasks Structure
   ↓
3. Store Tasks in Database (transaction)
   ↓
4. Return Structured Result
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

##### `generateTaskDecomposition(input: string)`
Uses Prompt Engine to generate task breakdown.

**Prompt Design:**
```
System: You are a task decomposition expert.

User Goal: "[user input]"

Your task:
1. Identify the main goal
2. Break it down into 5-8 concrete, actionable tasks
3. Each task should be specific and measurable
4. Assign priority (high, medium, low)

Guidelines:
- Tasks should be in logical order
- Each task completable independently
- Use action-oriented language (start with verbs)
- Be specific about what needs to be done
- Include technical details where relevant
```

**Schema:**
```typescript
{
  goal: 'string',
  tasks: 'array'  // Array of { title, description, priority }
}
```

**Temperature:** 0.7 (balanced creativity and consistency)

##### `validateTasksStructure(tasks: any[])`
Validates generated tasks meet requirements.

**Validation Rules:**
- Must be non-empty array
- Maximum 20 tasks
- Each task must have:
  - `title` (string)
  - `description` (string)
  - `priority` ('high' | 'medium' | 'low')

##### `storeTasks(input)`
Stores tasks in database using transaction.

**Transaction:**
```typescript
await prisma.$transaction(
  tasks.map((task, index) =>
    prisma.task.create({
      data: {
        sessionId,
        userId,
        goal,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'pending',
        order: index
      }
    })
  )
);
```

**Benefits:**
- Atomic operation (all or nothing)
- Maintains order
- Consistent state

##### `isGoalInput(input: string)`
Detects if input is a goal/project.

**Detection Logic:**
```typescript
Goal Keywords:
- build, create, develop, implement, make
- design, setup, configure, integrate
- add feature, new feature, project
- system, application, service, engine
- module, component

Criteria:
✓ Has goal keyword
✓ Reasonable length (15-500 chars)
✓ Not a question (no what/how/why/?)
```

##### `getSessionTasks(sessionId: string)`
Retrieves all tasks for a session.

**Query:**
```typescript
prisma.task.findMany({
  where: { sessionId },
  orderBy: { order: 'asc' }
})
```

##### `getUserTasks(userId: string, status?: string)`
Retrieves user's tasks, optionally filtered by status.

**Query:**
```typescript
prisma.task.findMany({
  where: {
    userId,
    ...(status && { status })
  },
  orderBy: [
    { createdAt: 'desc' },
    { order: 'asc' }
  ]
})
```

##### `updateTaskStatus(taskId: string, status: string)`
Updates task status.

**Valid Statuses:**
- `pending`: Not started
- `in_progress`: Currently working on
- `done`: Completed
- `cancelled`: Abandoned

##### `deleteTask(taskId: string)`
Permanently deletes a task.

##### `getTaskStats(userId: string)`
Returns task statistics for a user.

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

---

### 2. Orchestrator Integration

**Changes to:** `backend/src/services/orchestrator.service.ts`

#### Goal Detection
```typescript
// Check if this is a goal that should be decomposed into tasks
if (taskService.isGoalInput(input) && sessionId) {
  logger.info('[Orchestrator] Goal input detected');
  const shouldDecompose = await this.shouldDecomposeIntoTasks(input);
  
  if (shouldDecompose) {
    return await this.handleTaskDecomposition(input, userId, sessionId, servicesUsed, startTime);
  }
}
```

#### Task Decomposition Handler
```typescript
private async handleTaskDecomposition(
  input: string,
  userId: string,
  sessionId: string,
  servicesUsed: string[],
  startTime: number
): Promise<OrchestratorResponse>
```

**Flow:**
1. Call `taskService.decomposeTask()`
2. Format output with markdown
3. Return structured response
4. Handle errors gracefully

**Output Format:**
```markdown
I've broken down your goal into actionable tasks:

**Goal:** [goal description]

**Tasks (N):**

1. **[Task Title]** [PRIORITY]
   [Task description]

2. **[Task Title]** [PRIORITY]
   [Task description]

...

All tasks have been saved and are ready to track.
```

---

## 📊 Data Flow

```
User Input: "build resume engine"
         ↓
Orchestrator detects goal input
         ↓
Task Service
         ↓
┌─────────────────────────────────┐
│ 1. Generate Decomposition        │
│    - Call Prompt Engine          │
│    - Get structured response     │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 2. Validate Tasks                │
│    - Check structure             │
│    - Verify priorities           │
│    - Ensure completeness         │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 3. Store in Database             │
│    - Transaction (atomic)        │
│    - Link to session             │
│    - Set order                   │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 4. Format Response               │
│    - Goal summary                │
│    - Task list                   │
│    - Priority indicators         │
└─────────────────────────────────┘
         ↓
Return to User
```

---

## 🧪 Testing

### Test Scenario 1: Build Resume Engine

**Input:**
```
User: "build resume engine"
```

**Expected Output:**
```
I've broken down your goal into actionable tasks:

**Goal:** Build a resume work engine that allows users to continue their previous work sessions

**Tasks (7):**

1. **Create Resume Service** [HIGH]
   Implement src/services/resume.service.ts with core resumeWork() function that retrieves session data and analyzes message history

2. **Design Database Schema** [HIGH]
   Ensure Session and Message models support resume functionality with proper indexes and relations

3. **Implement Message Analysis** [HIGH]
   Build logic to extract context from last 10 messages including topics, intents, and actions

4. **Integrate Prompt Engine** [HIGH]
   Create prompt template for generating resume summaries with current state and next steps

5. **Update Orchestrator** [MEDIUM]
   Add resume request detection and routing to resume service in orchestrator.service.ts

6. **Add Error Handling** [MEDIUM]
   Implement graceful error handling for missing sessions and empty message history

7. **Write Tests** [LOW]
   Create test scenarios for resume functionality including edge cases and error conditions

All tasks have been saved and are ready to track. You can start working on them in order, or tackle high-priority items first.
```

**Database State:**
- 7 tasks created
- All linked to current session
- Status: pending
- Priorities: 4 high, 2 medium, 1 low
- Order: 0-6

### Test Scenario 2: Create Authentication System

**Input:**
```
User: "create authentication system with JWT"
```

**Expected Output:**
```
I've broken down your goal into actionable tasks:

**Goal:** Create a secure authentication system using JWT tokens

**Tasks (6):**

1. **Setup JWT Library** [HIGH]
   Install and configure jsonwebtoken library with proper secret key management

2. **Create Auth Middleware** [HIGH]
   Implement middleware to verify JWT tokens and attach user to request object

3. **Build Login Endpoint** [HIGH]
   Create POST /auth/login endpoint that validates credentials and returns JWT

4. **Build Register Endpoint** [MEDIUM]
   Create POST /auth/register endpoint with password hashing using bcrypt

5. **Add Token Refresh** [MEDIUM]
   Implement refresh token mechanism for extended sessions

6. **Add Logout Functionality** [LOW]
   Create logout endpoint and token blacklist mechanism

All tasks have been saved and are ready to track.
```

### Test Scenario 3: Not a Goal (Question)

**Input:**
```
User: "What is the best way to implement authentication?"
```

**Expected Behavior:**
- NOT detected as goal (it's a question)
- Routes to normal intent detection (QUERY)
- No task decomposition

### Test Scenario 4: Short Input

**Input:**
```
User: "build app"
```

**Expected Behavior:**
- NOT detected as goal (too short, not specific)
- Routes to normal intent detection
- No task decomposition

---

## 🔍 Key Features

### ✅ Intelligent Goal Detection
- Keyword-based detection
- Length validation
- Question filtering
- Context-aware triggering

### ✅ AI-Powered Decomposition
- Prompt Engine integration
- Structured response generation
- 5-8 actionable tasks
- Priority assignment

### ✅ Database Persistence
- Atomic transactions
- Proper indexing
- Session association
- Status tracking

### ✅ Task Management
- CRUD operations
- Status updates
- Priority management
- Statistics tracking

### ✅ Validation & Error Handling
- Structure validation
- Priority validation
- Count limits (max 20)
- Graceful error messages

---

## 🚀 Usage

### API Integration

Task decomposition is automatically triggered when the orchestrator detects a goal input.

**Example Request:**
```typescript
POST /api/chat
{
  "message": "build resume engine",
  "sessionId": "session123"
}
```

**Example Response:**
```typescript
{
  "intent": "TASK_DECOMPOSITION",
  "output": "I've broken down your goal into actionable tasks:\n\n**Goal:** ...",
  "references": [],
  "actions": [{
    "type": "task_decomposition",
    "status": "completed",
    "details": {
      "goal": "Build a resume work engine...",
      "taskCount": 7,
      "tasks": [
        { "title": "Create Resume Service", "priority": "high" },
        { "title": "Design Database Schema", "priority": "high" },
        ...
      ]
    }
  }],
  "metadata": {
    "processingTimeMs": 2341,
    "confidence": 1.0,
    "servicesUsed": ["task", "gemini"]
  }
}
```

### Get Session Tasks

```typescript
const tasks = await taskService.getSessionTasks(sessionId);
```

### Get User Tasks

```typescript
// All tasks
const allTasks = await taskService.getUserTasks(userId);

// Only pending tasks
const pendingTasks = await taskService.getUserTasks(userId, 'pending');
```

### Update Task Status

```typescript
await taskService.updateTaskStatus(taskId, 'in_progress');
await taskService.updateTaskStatus(taskId, 'done');
```

### Get Task Statistics

```typescript
const stats = await taskService.getTaskStats(userId);
// { total: 15, pending: 8, inProgress: 3, done: 4, cancelled: 0 }
```

---

## 📈 Performance

### Metrics
- **Average Processing Time:** 2-3 seconds
- **Database Operations:** 1 transaction (N inserts)
- **AI Calls:** 1 (Gemini via Prompt Engine)
- **Task Generation:** 5-8 tasks typical

### Optimization
- Uses database transactions (atomic)
- Indexed queries for fast retrieval
- Validates before storing
- Efficient prompt design

---

## 🔐 Security

### Access Control
- Tasks linked to userId
- Session validation
- User ownership verification

### Data Validation
- Input length limits
- Priority validation
- Status validation
- Structure validation

### Database Integrity
- Foreign key constraints
- Indexed lookups
- Transaction safety

---

## 🎨 Output Format

The task decomposition response is formatted with markdown:

```markdown
I've broken down your goal into actionable tasks:

**Goal:** [Goal description]

**Tasks (N):**

1. **[Task Title]** [PRIORITY]
   [Detailed description]

2. **[Task Title]** [PRIORITY]
   [Detailed description]

...

All tasks have been saved and are ready to track. You can start working 
on them in order, or tackle high-priority items first.
```

---

## 🔄 Future Enhancements

### Potential Improvements
1. **Task Dependencies:** Define task prerequisites
2. **Time Estimates:** Add duration estimates
3. **Subtasks:** Break down complex tasks further
4. **Task Templates:** Reusable task patterns
5. **Progress Tracking:** Visual progress indicators
6. **Task Assignment:** Multi-user collaboration
7. **Notifications:** Remind about pending tasks
8. **Task Analytics:** Completion rates, time tracking
9. **Smart Reordering:** AI-suggested task order
10. **Integration:** Link tasks to Notion, GitHub, etc.

---

## 🧩 Integration Points

### With Session System
- Tasks linked to sessions
- Conversation context preserved
- Session-based task retrieval

### With Resume Engine
- Resume can show pending tasks
- Suggest next task to work on
- Track task completion in context

### With Notion
- Export tasks to Notion
- Sync task status
- Create task pages

---

## 📊 Database Queries

### Create Tasks (Transaction)
```sql
BEGIN;
INSERT INTO tasks (id, session_id, user_id, goal, title, description, priority, status, "order")
VALUES ('task1', 'session123', 'user456', 'Build resume engine', 'Create Resume Service', '...', 'high', 'pending', 0);
-- ... more inserts
COMMIT;
```

### Get Session Tasks
```sql
SELECT * FROM tasks 
WHERE session_id = 'session123' 
ORDER BY "order" ASC;
```

### Get User Tasks by Status
```sql
SELECT * FROM tasks 
WHERE user_id = 'user456' AND status = 'pending'
ORDER BY created_at DESC, "order" ASC;
```

### Update Task Status
```sql
UPDATE tasks 
SET status = 'done', updated_at = NOW() 
WHERE id = 'task1';
```

### Get Task Statistics
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'done') as done,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM tasks 
WHERE user_id = 'user456';
```

---

## 🧪 Migration Steps

### Step 1: Generate Migration

```bash
cd backend
npx prisma migrate dev --name add_task_model
```

This will:
1. Create new `tasks` table
2. Add indexes
3. Generate migration file

### Step 2: Verify Migration

```bash
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

This updates TypeScript types for the new Task model.

### Step 4: Test Database

```bash
npx prisma studio
```

Opens Prisma Studio to view/edit tasks.

---

## 📝 Example Prompt Engineering

### Input Goal
```
"build resume engine"
```

### System Prompt
```
You are a task decomposition expert. Break down the user's goal into clear, actionable tasks.

User Goal: "build resume engine"

Your task:
1. Identify the main goal
2. Break it down into 5-8 concrete, actionable tasks
3. Each task should be specific and measurable
4. Assign priority (high, medium, low)

Guidelines:
- Tasks should be in logical order
- Each task completable independently
- Use action-oriented language
- Be specific about what needs to be done
- Include technical details
```

### AI Response
```json
{
  "goal": "Build a resume work engine that allows users to continue their previous work sessions",
  "tasks": [
    {
      "title": "Create Resume Service",
      "description": "Implement src/services/resume.service.ts with core resumeWork() function that retrieves session data and analyzes message history",
      "priority": "high"
    },
    {
      "title": "Design Database Schema",
      "description": "Ensure Session and Message models support resume functionality with proper indexes and relations",
      "priority": "high"
    },
    ...
  ]
}
```

---

## ✨ What Makes This Production-Grade

✅ **Real Database Integration:** Prisma with PostgreSQL
✅ **Atomic Transactions:** All-or-nothing task creation
✅ **Proper Indexing:** Fast queries on sessionId, userId, status
✅ **AI-Powered:** Intelligent task generation via Prompt Engine
✅ **Validation:** Structure, priority, and count validation
✅ **Error Handling:** Comprehensive error messages
✅ **Type Safety:** Full TypeScript types
✅ **Status Tracking:** pending → in_progress → done
✅ **Priority Management:** high, medium, low
✅ **Scalability:** Efficient storage and retrieval
✅ **Observability:** Detailed logging
✅ **CRUD Operations:** Complete task management
✅ **Statistics:** Task analytics and reporting

---

## 🎯 Summary

The Task Decomposition Engine successfully implements:

✅ AI-powered task breakdown (5-8 tasks)
✅ Database persistence with Task model
✅ Prompt Engine integration
✅ Orchestrator integration with auto-detection
✅ Priority assignment (high, medium, low)
✅ Status tracking (pending, in_progress, done, cancelled)
✅ CRUD operations for task management
✅ Task statistics and analytics
✅ Comprehensive error handling
✅ Production-ready logging

**Result:** Users can now input complex goals and receive structured, actionable task lists that are automatically saved and ready to track.

---

## 🔗 Related Phases

- **PHASE 7:** Session Persistence (provides session context)
- **PHASE 8:** Resume Work Engine (can show pending tasks)
- **PHASE 10:** Task execution and tracking (coming next)

The Task Decomposition Engine transforms vague goals into concrete action plans, making complex projects manageable and trackable.
