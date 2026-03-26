# ORIN Architecture

# Overview
ORIN is a layered intelligent execution platform that combines:
- Intent-driven orchestration for chat and task workflows
- Persistent distributed workflow execution
- Real-time monitoring and control
- A multi-agent collaboration system
- A self-evolving optimization subsystem
- A Next.js frontend split between chat operations and workflow operations

This document is synthesized from:
- All files in docs/
- All files in phase/ (PHASE_1 through PHASE_21, including PHASE_17.5)
- Implemented backend and frontend architecture

It is intended to be the single source of truth for current architecture and near-term evolution.

# Current Phase
## Phase Detection
- Highest completed phase in repository: Phase 21 (Self-Evolving Agent System)
- Supporting maturity checkpoint: docs/TEST.md validates Phases 15-21 as operational; docs/EXECUTIVE_SUMMARY.md marks production readiness at 95%

## Current Status
- Current Phase: Phase 21
- System Stage: Autonomous
- Maturity Characterization: Autonomous system on top of distributed workflow core, with production hardening gaps still tracked

## Evolution Timeline
- Phase 1-3: Intent detection, orchestrator foundation, structured prompt engine
- Phase 4-8: Notion write/retrieval, chat refactor, session persistence, resume engine
- Phase 9-10: Task decomposition and task execution lifecycle
- Phase 11-12: Adaptive intelligence and meta-orchestrator strategy scoring
- Phase 13-14: Autonomous agent layer and multi-step workflow planning
- Phase 15: Persistent distributed workflow execution with locks and retry queue
- Phase 16: Monitoring and control backend layer
- Phase 17: Real-time workflow monitoring dashboard
- Phase 17.5: Frontend production hardening architecture
- Phase 18: Intelligent dashboard reconciliation and predictive behavior
- Phase 19: Semi-autonomous decisioning and policy-governed execution
- Phase 20: Multi-agent collaboration system (5 specialized agents)
- Phase 21: Self-evolving agent system (meta-learning, dynamic agent creation, optimization, safety)

# System Architecture
## High-Level Components (Document Index Synthesis)
1. Core System
- Intent service
- Orchestrator service
- Prompt/Gemini integration
- Session/message persistence
- Notion write and context retrieval services

2. Intelligence Layer
- Adaptive learning service
- Meta-orchestrator strategy engine
- Decision scoring and recommendations

3. Execution Layer
- Task decomposition service
- Task execution service
- Action execution and decision engine

4. Workflow Engine
- Workflow planning agent service
- Workflow repository (Prisma)
- Workflow runner with distributed locking
- Retry queue and timeout handling

5. Monitoring System
- Monitoring service with workflow and system metrics
- Alert generation and retention
- WebSocket broadcast integration

6. Frontend System
- Next.js app shell
- Dashboard (chat-oriented interaction)
- Workflows monitor (real-time operational view)
- Zustand stores + React Query + WebSocket reconciliation

## Overall System Diagram (Text-Based)
```text
[User]
  |
  v
[Next.js Frontend]
  |-- /dashboard (chat + command UX)
  |-- /workflows (monitoring + controls)
  |
  +--> HTTP API (/api/v1, /api/workflows, /api/multi-agent, /api/evolution, /api/autonomy)
  |
  +--> WebSocket (/ws)
           ^
           |
[WebSocket Gateway] <--- [Monitoring Service EventEmitter]
                               ^
                               |
                   [Workflow Runner Service] <--> [Workflow Repository]
                               |
                               v
                     [Task/Execution/Agent Services]
                               |
                               v
                    [Prisma + SQLite datasource]

Parallel intelligence subsystems:
- [Meta-Orchestrator] -> strategy: decompose/execute/resume/respond/ask
- [Multi-Agent Orchestrator] -> monitoring, optimization, recovery, planning, user assistant
- [Evolution Orchestrator] -> self-optimization, dynamic agents, safety checks
```

## Component Interaction Model
- Frontend chat path routes user message to chat controller and orchestrator
- Orchestrator chooses strategy through meta-orchestrator, then delegates to specialized services
- Workflow operations are persisted via workflow repository and executed by polling workers
- Monitoring service emits workflow/system events to WebSocket gateway
- Frontend subscribes to workflow events and reconciles real-time state with React Query and Zustand
- Multi-agent system runs in parallel and communicates via message bus and coordinator
- Evolution orchestrator optimizes agents/strategies and enforces safety constraints

## Data Flow
- Control data: User input -> orchestration strategy -> service execution -> response payload
- Workflow data: Planned steps -> persisted workflow state -> step results -> final status
- Observability data: Runner and monitoring events -> metrics/alerts -> websocket broadcasts -> dashboard state
- Learning data: Decision and execution outcomes -> adaptive/evolution systems

## Control Flow
- Synchronous control: HTTP request/response through controller-service-repository
- Asynchronous control: workflow runner polling loop, queue processing, multi-agent proposal processing
- Supervisory control: safety and policy checks before autonomous or evolutionary actions

## Event Flow (WebSocket + Workflows)
- Workflow runner marks step/workflow transitions
- Monitoring service emits typed workflow events and periodic system metrics
- WebSocket gateway forwards:
  - workflow_event to workflow subscribers
  - system metrics broadcasts to all clients
  - alerts to connected clients
- Frontend consumes events with dedupe and ordering logic, then updates stores and query cache

# Layers
## 1. Presentation Layer (Frontend)
Responsibilities
- User interaction for chat and workflow operations
- Real-time workflow visibility and controls
- Client-side optimistic updates and reconciliation

Key Services
- Next.js routes: app/page.tsx, app/dashboard/page.tsx, app/workflows/page.tsx
- QueryProvider, WebSocketProvider
- UI components: workflow charts, alerts, connection indicator

Inputs
- REST API responses
- WebSocket events

Outputs
- User commands, control actions (pause/resume/cancel), subscriptions

## 2. Orchestration Layer (Meta-Orchestrator)
Responsibilities
- Select handling strategy per input based on context scoring
- Route to decomposition, execution, resume, response, or clarification

Key Services
- meta-orchestrator.service.ts
- orchestrator.service.ts

Inputs
- User text, session/task context, adaptive insights

Outputs
- Strategy decisions and routed service calls

## 3. Intelligence Layer (Adaptive + Agent)
Responsibilities
- Learn from historical execution behavior
- Predict and recommend actions
- Coordinate autonomous/multi-agent reasoning

Key Services
- adaptive.service.ts
- agent.service.ts
- multi-agent-orchestrator.service.ts
- agent infrastructure (message bus, coordinator, shared state)

Inputs
- Session/task history, workflow outcomes, messages

Outputs
- Recommendations, proposals, optimized actions

## 4. Execution Layer (Task Engine)
Responsibilities
- Decompose goals into tasks
- Select next tasks
- Generate execution plans and track completion

Key Services
- task.service.ts
- execution.service.ts
- decision/action execution services in autonomy subsystem

Inputs
- User goals, session context

Outputs
- Task records, execution instructions, completion state updates

## 5. Workflow Layer (Distributed Engine)
Responsibilities
- Persist workflow plans and step state
- Execute steps with lock-safe distributed workers
- Handle retries, timeouts, and recovery transitions

Key Services
- workflow-agent.service.ts
- workflow-runner.service.ts
- workflow.repository.ts

Inputs
- Workflow plans and step definitions

Outputs
- Step results, workflow status transitions, queue items

## 6. Monitoring Layer
Responsibilities
- Track workflow/system metrics
- Emit operational events
- Generate and expose alerts

Key Services
- monitoring.service.ts
- websocket.gateway.ts
- workflow controller metrics/alerts endpoints

Inputs
- Workflow runner events and repository stats

Outputs
- Metrics snapshots, alert feed, websocket broadcasts

## 7. Data Layer (DB + State)
Responsibilities
- Persist users, sessions, messages, tasks, workflows, decisions, autonomy settings
- Provide indexed queries for runtime services

Key Services
- Prisma schema and client
- SQLite datasource (current)
- In-memory runtime stores for metrics/events/agent state (current implementation)

Inputs
- Service-layer write operations

Outputs
- Persisted state for orchestration, workflow and analytics paths

# Backend
## Service Overview
Core API surface
- /api/health
- /api/v1/message and /api/v1/sessions
- /api/v1/intent
- /api/v1/workflows (+ control and metrics endpoints)
- /api/multi-agent
- /api/evolution
- /api/autonomy

Cross-cutting middleware
- Helmet
- CORS restricted by FRONTEND_URL
- JSON/urlencoded parsers
- dev logging via morgan
- async handler + global APIError handling

Runtime startup
- Database connect
- HTTP server bind
- WebSocket gateway init
- Monitoring service start
- Workflow runner start

## Orchestrator Flow
1. Chat controller validates input and resolves session
2. User message persisted
3. Orchestrator invokes meta-orchestrator strategy decision
4. Strategy route:
- RESUME -> resume service
- EXECUTE -> execution service (or completion)
- DECOMPOSE -> task service
- ASK -> clarification response
- RESPOND -> intent detection and intent-specific handlers
5. Assistant message persisted with metadata and action traces
6. Standardized response returned to client

## Agent + Workflow Interaction
- Multi-agent orchestrator initializes coordinator and five agents
- Agents subscribe to message bus and publish follow-up messages
- Coordinator prioritizes and processes proposals
- Shared state tracks proposals and execution status
- Workflow runner and monitoring provide operational signals consumed by monitoring/recovery/planning behaviors

## Execution Lifecycle
1. Goal decomposition creates ordered tasks
2. Execution service selects next actionable task
3. Execution request transitions task to in_progress
4. Completion request marks task done and computes progress
5. Adaptive and meta layers consume execution outcomes for improved decisions

## Distributed Worker Model
- Workflow runner polls pending/running workflows on interval
- Worker acquires DB lock per workflow (lockWorkflow)
- max concurrent workflows per worker is bounded
- lock expiry enables stale lock recovery
- workflow released on completion/failure/finally

## Queue + Retry System
- Failed retryable steps enqueue into workflow_queue
- Retry uses exponential backoff policy
- Timeout monitoring identifies and flags timed-out steps
- Pause logic can gate high-risk steps for approval

# Frontend
## Next.js Structure
- app/layout.tsx provides QueryProvider + WebSocketProvider + global UI providers
- app/page.tsx redirects to /dashboard
- app/dashboard/page.tsx focuses on conversational interaction and session-local UX
- app/workflows/page.tsx focuses on operational monitoring and control

## State Management (Zustand)
Stores
- workflow.store.ts: normalized workflow entities + step updates
- metrics.store.ts: normalized metrics with bounded history
- alerts.store.ts: alerts and unread tracking
- timeline.store.ts: event timeline and audit-friendly event capture

## WebSocket Integration
- websocket-client with heartbeat and exponential reconnect attempts
- useEnhancedWebSocket hook:
  - event deduplication
  - version/order-aware processing
  - buffered metrics updates
  - query cache + zustand reconciliation
- workflow subscriptions at per-workflow granularity

## API + Real-Time Sync Model
- React Query handles server-state fetching and mutations
- Optimistic mutations for pause/resume/cancel
- WebSocket events patch local state between polling intervals
- Reconciliation on reconnect invalidates and refreshes critical queries

## Dashboard + Chat Separation
- /dashboard: user command/chat path (currently local state oriented)
- /workflows: operations path (query + websocket + charts + alerts)
- This split enables operational observability without blocking chat UX

# Data Flow
## 1. User Request -> Orchestrator -> Response
1. User submits message
2. Chat controller validates and creates/fetches session
3. Message persisted to Session/Message models
4. Orchestrator selects strategy via meta-orchestrator
5. Delegated services execute (intent, task, execution, resume, notion/gemini)
6. Response persisted and returned with metadata/actions

## 2. Task Lifecycle
1. Goal identified for decomposition
2. Task records created with order/priority/status
3. Next task selected for execution
4. Task moved to in_progress
5. Completion marks done, updates metrics/progress

## 3. Workflow Lifecycle
1. Workflow planned into steps with dependencies/risk/retry policy
2. Workflow persisted in pending state
3. Worker locks and runs workflow
4. Each step moves pending -> running -> completed/failed
5. Results persisted per step
6. Workflow transitions to completed/paused/failed

## 4. Real-Time Updates via WebSocket
1. Monitoring service emits workflow/system event
2. WebSocket gateway forwards to subscribers/all clients
3. Frontend hook dedupes/orders/reconciles events
4. Zustand + query cache update UI in near real time

# Decision System
## Meta-Orchestrator Decisioning
Decision objective
- Select best strategy for each input based on context, history and heuristics

Available strategies
- decompose
- execute
- resume
- respond
- ask

Scoring signals include
- presence of session/task context
- pending/in-progress task availability
- user input intent shape (goal, execution request, resume request, ambiguity)
- adaptive insights where available

## Strategy Selection
- calculate score per strategy
- pick highest score
- compute confidence from score distribution
- provide alternatives and context factors for traceability

## Agent Prediction + Automation
- autonomous and multi-agent services produce proposals and suggested actions
- execution eligibility is governed by autonomy level and policy constraints
- semi-auto/auto modes expand permitted actions and lower confidence threshold

# Workflow Engine
## Planning
- Workflow agent decomposes high-level goal into executable steps
- Each step includes action, dependencies, risk, retryability and estimated duration

## Execution
- Runner performs topological order resolution
- Dependencies are validated before step execution
- Step actions are dispatched by action type

## Retry Logic
- Step failures trigger retry path if retryable and under max retries
- Exponential backoff schedules queue attempts

## Distributed Locking
- lockWorkflow prevents competing workers from processing same workflow
- stale locks are reclaimable after timeout window

## State Persistence
- Workflow, WorkflowStep, WorkflowResult, WorkflowQueue in Prisma schema
- currentStep, status, lock metadata and timestamps persisted

## Crash Recovery
- persisted status + lock expiry allow resumed processing after process crash
- timeout monitor and queue processor support recovery loop continuation

# Monitoring
## Metrics Tracking
- Workflow-level metrics maintained in memory map
- System metrics computed from repository statistics
- Periodic collection emits broadcast payloads

## Alerts
- Alert generation based on failure rate, queue backlog, timeout spikes and failures
- bounded alert retention
- API retrieval and clear endpoints

## WebSocket Streaming
- monitoring service emits to gateway listeners
- workflow-specific and global streams supported

## Dashboard Integration
- workflows page displays metrics cards, charts, alerts list, and connection status
- near real-time updates blended with React Query fetches

# Real-Time System
## WebSocket Architecture
Backend
- ws server mounted at /ws
- connection lifecycle handlers, heartbeat, subscription map

Frontend
- singleton websocket client
- subscribe/unsubscribe API per workflow
- reconnect with exponential backoff

## Event Types
- workflow_started, workflow_completed, workflow_failed, workflow_paused
- step_started, step_completed, step_failed, step_timeout
- system metrics broadcasts
- alert events

## State Synchronization
- event deduplication by event identity
- version-aware ordering and queueing
- reconciliation between optimistic cache and live patches

## Client Update Flow
- incoming websocket event
- event ordering and dedupe
- timeline append
- zustand update
- query cache update/invalidate
- component re-render

# Scalability
## Horizontal Scaling
- Workflow execution supports multi-worker scaling through DB locking
- lock ownership and lock timeout coordinate distributed workers

## Fault Tolerance
- workflow persistence allows restart recovery
- stale lock reclamation
- retry queue with backoff
- timeout detection and alerting

## Idempotency
- step execution checks completed state before re-run
- update-by-identity patterns in repository reduce duplicate effects
- explicit API idempotency keys are not yet present

## Locking Strategy
- per-workflow lock (lockedBy, lockedAt)
- lock acquisition for pending/running with stale-lock override
- unlock on completion/failure/finally

## Queue System
- workflow_queue stores deferred retries
- priority and schedule-time sorting
- periodic processing loop

# Limitations
1. State synchronization fragmentation
- Two frontend interaction models coexist: legacy chat-local state in /dashboard and real-time operational model in /workflows
- End-to-end unified session/workflow state across both views is not fully consolidated

2. WebSocket reliability gaps
- No authenticated websocket handshake enforcement in gateway
- Backpressure and outbound queue controls are limited
- Reconnect handling exists, but reliability under prolonged disconnect/load needs hardening

3. Caching layer absent
- No dedicated distributed cache (for example Redis) for hot orchestration/workflow metadata
- Several runtime structures remain process-memory only (agent memory, metrics maps, in-memory histories)

4. Performance bottlenecks
- Poll-based workflow scheduling introduces latency and periodic DB load
- Step execution is sequential within a workflow
- Monitoring metrics and alert checks are interval-based and mostly in-memory

5. Incomplete production-hardening items still documented
- Agent memory persistence to DB remains incomplete
- Some recovery/policy integration paths include TODO or simplified placeholders
- Frontend production validation against full live agent behavior is still tracked as a gap in docs

# Future Roadmap
## Phase 17.5 (Production Hardening)
- Continue hardening of frontend data model consistency
- Strengthen query/websocket reconciliation reliability
- Improve mutation conflict handling and operational UX quality

## Phase 18 (AI-Driven Workflows)
- Intelligent dashboard behavior and predictive monitoring
- Workflow version-aware event ordering and reconciliation
- Self-aware workflow state interpretation

## System Evolution Path
1. Stabilize production-hardening backlog
- Persist agent learning/memory
- complete recovery execution internals
- tighten policy integration and observability

2. Scale distributed execution
- increase worker orchestration sophistication
- consider message-queue/event-driven dispatch beyond polling loops
- introduce explicit idempotency keys and stronger retry semantics

3. Mature autonomous operations
- strengthen safety governance for evolution/autonomy
- expand closed-loop optimization with persistent outcome analytics
- evolve toward policy-auditable autonomous decision lifecycle

4. Harden platform operations
- add cache tier and external observability integrations
- load/performance testing and failure-injection drills
- production SLO and alert tuning with capacity planning
