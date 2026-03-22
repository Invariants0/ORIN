# ORIN System - Quick Start Guide

## Prerequisites
- Bun runtime installed
- Node.js 18+ (for frontend)
- Git

## 1. Start Backend (Required)

```bash
cd backend
bun install
bun run db:push
bun run dev
```

Backend will start on: `http://localhost:8000`

## 2. Verify Backend is Running

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "success",
  "message": "ORIN API is running",
  "timestamp": "2026-03-22T..."
}
```

## 3. Initialize Multi-Agent System

```bash
curl -X POST http://localhost:8000/api/multi-agent/initialize
```

Expected response:
```json
{
  "success": true,
  "message": "Multi-agent system initialized successfully"
}
```

## 4. Initialize Evolution System

```bash
curl -X POST http://localhost:8000/api/evolution/initialize
```

Expected response:
```json
{
  "success": true,
  "message": "Evolution system initialized",
  "status": {
    "enabled": true,
    "mode": "learning",
    ...
  }
}
```

## 5. Test Multi-Agent Query

```bash
curl -X POST http://localhost:8000/api/multi-agent/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Optimize system performance","userId":"test-user"}'
```

## 6. Check System Stats

```bash
curl http://localhost:8000/api/multi-agent/stats
```

You should see:
- 5 agents (monitoring, optimization, recovery, planning, user_assistant)
- Message bus stats
- Coordinator stats
- Shared state (systemHealth: "healthy")

## 7. Monitor System Activity

Watch the backend logs for:
- `[monitoringAgent] Proposal created` (every 10s)
- `System metrics collected` (every 10s)
- Agent initialization messages
- Message bus activity

## 8. Start Frontend (Optional)

```bash
cd frontend
bun install
bun run dev
```

Frontend will start on: `http://localhost:3000`

## Available API Endpoints

### Health & Status
- `GET /api/health` - System health check
- `GET /api/multi-agent/stats` - Multi-agent statistics
- `GET /api/evolution/status` - Evolution system status

### Multi-Agent System
- `POST /api/multi-agent/initialize` - Initialize agents
- `POST /api/multi-agent/query` - Send query to agents
- `GET /api/multi-agent/messages` - Get message history
- `GET /api/multi-agent/agents/status` - Get agent statuses
- `GET /api/multi-agent/alerts` - Get pending alerts
- `GET /api/multi-agent/state` - Get shared state
- `POST /api/multi-agent/shutdown` - Shutdown system

### Evolution System
- `POST /api/evolution/initialize` - Initialize evolution
- `GET /api/evolution/status` - Get evolution status
- `GET /api/evolution/metrics` - Get evolution metrics
- `POST /api/evolution/optimize` - Run optimization cycle
- `GET /api/evolution/agents/:agentType/performance` - Agent performance
- `POST /api/evolution/agents/:agentType/optimize` - Optimize agent
- `POST /api/evolution/agents/create` - Create dynamic agent
- `GET /api/evolution/agents/dynamic` - List dynamic agents
- `GET /api/evolution/meta/patterns` - Get learned patterns
- `GET /api/evolution/meta/insights` - Get insights
- `GET /api/evolution/safety/status` - Safety status
- `POST /api/evolution/safety/checkpoint` - Create checkpoint
- `POST /api/evolution/safety/rollback` - Rollback to checkpoint

### Workflows
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow details
- `POST /api/v1/workflows/:id/pause` - Pause workflow
- `POST /api/v1/workflows/:id/resume` - Resume workflow
- `POST /api/v1/workflows/:id/cancel` - Cancel workflow

### Autonomy
- `POST /api/autonomy/configure` - Configure autonomy level
- `GET /api/autonomy/config/:userId` - Get user config
- `GET /api/autonomy/actions` - Get action history
- `POST /api/autonomy/approve/:id` - Approve action
- `POST /api/autonomy/undo/:id` - Undo action
- `GET /api/autonomy/logs` - Get decision logs
- `GET /api/autonomy/insights` - Get learning insights
- `POST /api/autonomy/emergency-stop` - Emergency stop

## Troubleshooting

### Port 8000 already in use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Database issues
```bash
cd backend
rm dev.db
bun run db:push
```

### Missing dependencies
```bash
cd backend
bun install
```

## What to Expect

### On Startup
- Database connection established
- WebSocket server initialized
- Monitoring service started
- Workflow runner started
- All services operational in <1 second

### During Operation
- Monitoring agent creates proposals every 10 seconds
- System metrics collected every 10 seconds
- Agents communicate via message bus
- Coordinator processes proposals
- Evolution system optimizes continuously

### In Logs
```
✅ [Prisma] Database connection established
✅ WebSocket server initialized on /ws
✅ Monitoring service started
✅ Workflow runner started
✅ ORIN Server running on port 8000
✅ [MultiAgentOrchestrator] Multi-agent system initialized successfully
✅ [EvolutionOrchestrator] System is now self-evolving
✅ [monitoringAgent] Proposal created
✅ System metrics collected
```

## Next Steps

1. Read `TEST.md` for comprehensive validation report
2. Read `EXECUTIVE_SUMMARY.md` for high-level overview
3. Explore API endpoints
4. Test multi-agent queries
5. Monitor system behavior
6. Integrate with frontend

## Support

- Full validation report: `TEST.md`
- Executive summary: `EXECUTIVE_SUMMARY.md`
- API documentation: `docs/` directory
- Phase documentation: `docs/PHASE_*.md`

---

**System Status:** ✅ OPERATIONAL  
**Production Ready:** 95%  
**Last Validated:** March 22, 2026
