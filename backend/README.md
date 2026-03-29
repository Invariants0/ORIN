# ⚙️ ORIN Backend

### Express API & Orchestration Engine for the **Notion AI Challenge**

<div align="center">

[![Frontend](https://img.shields.io/badge/🎨%20FRONTEND-orin--delta.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge)

[![Express.js](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0-4285f4?style=for-the-badge)](https://ai.google.dev)
[![Notion MCP](https://img.shields.io/badge/🤖%20Notion%20MCP-Native-black?style=for-the-badge&logo=notion)](https://notionhq.com)

</div>

---

## 💼 Purpose

Backend orchestrates the complete ORIN system:

- 🧠 **Intent Orchestration** — Parse user intent & choose action path
- 📋 **Task Decomposition** — Break complex goals into executable steps
- ⚡ **Workflow Execution** — Manage multi-step operations with state tracking
- 🤖 **Multi-Agent System** — Coordinate specialized agents (chat, content, evolution)
- 🔌 **Dual Notion Integration** — Native MCP + REST API fallback
- 📊 **Real-Time Monitoring** — WebSocket event emission & metrics
- 🔐 **Secure Authentication** — Better Auth + JWT token management

---

## 🚀 Runtime Overview

### Startup Sequence

```
1. ✅ Load environment config
2. 📚 Connect Prisma database
3. 🌐 Start HTTP server (port 8000)
4. ⚡ Initialize WebSocket gateway
5. 📊 Start monitoring service
6. 🔄 Start workflow runner
```

**Default Port:** `8000`

---

## 📡 API Route Groups

| Route | Purpose |
|-------|---------|
| `/api/health` | System health & readiness checks |
| `/api/auth` | Better Auth server routes |
| `/api/notion` | Notion OAuth + MCP setup |
| `/api/v1/chat` | Chat endpoint & intent parsing |
| `/api/v1/intent` | Intent classification service |
| `/api/v1/workflows` | Workflow CRUD & execution |
| `/api/v1/evolution` | Multi-agent evolution system |
| `/api/v1/multi-agent` | Agent coordination |
| `/api/v1/autonomy` | Autonomous task execution |
| `/api/v1/content` | Content generation & retrieval |

---

## 🚀 Local Development

### Prerequisites
- 🦅 Bun or Node.js 20+
- 🗄️ Database (SQLite for dev, PostgreSQL for prod)

### Setup

```bash
cd backend
bun install             # Install dependencies
bunx prisma generate   # Generate Prisma client
bun run dev            # Start dev server
```

**Server runs on:** `http://localhost:8000`

Health check: `curl http://localhost:8000/api/health`

---

## 🔧 Environment Variables

### Required

```env
# Core
NODE_ENV=development
PORT=8000

# Database
DATABASE_URL=file:./dev.db

# Authentication
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:8000/api/auth

# AI
GEMINI_API_KEY=your-api-key

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Optional

```env
# Notion REST OAuth
NOTION_OAUTH_CLIENT_ID=...
NOTION_OAUTH_CLIENT_SECRET=...

# Notion MCP
NOTION_MCP_ENABLED=true

# Logging
LOG_LEVEL=debug

# Monitoring
ENABLE_METRICS=true
```

---

## 📦 Available Scripts

```bash
bun run dev        # ▶️ Start development server
bun run build      # 🏗️ Build TypeScript
bun run start      # ⚡ Start production server
bun run lint       # 🔍 Run ESLint
bun run type-check # 🔎 Check TypeScript
```

---

## 📁 Key Directories

```
backend/
├─ src/
│  ├─ app.ts              Express app setup
│  ├─ server.ts           HTTP server bootstrap
│  ├─ config/             Configuration & secrets
│  │  ├─ auth.ts
│  │  ├─ database.ts
│  │  ├─ envVars.ts
│  │  └─ logger.ts
│  ├─ controllers/        Route handlers (7 files)
│  ├─ services/           Business logic
│  ├─ routes/             API endpoints
│  ├─ middlewares/        Auth, validation, error handling
│  ├─ schemas/            Zod validation schemas
│  ├─ types/              TypeScript interfaces
│  └─ utils/              Helper functions
├─ prisma/
│  └─ schema.prisma       ORM schema
└─ package.json           Dependencies
```

---

## 🏥 Health & Smoke Checks

### Basic Health Check

```bash
curl http://localhost:8000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-29T18:30:00Z"
}
```

### Check Notion Connectivity

```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8000/api/notion/status
```

### Test Gemini Integration

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","context":{}}'
```

---

## 🔌 Integration Points

| Service | Protocol | Auth | Purpose |
|---------|----------|------|---------|
| **Gemini API** | gRPC/HTTP | API Key | Intent parsing, content generation |
| **Notion REST** | HTTPS | OAuth Token | User workspace context |
| **Notion MCP** | stdio | Native Protocol | Direct workspace access |
| **PostgreSQL** | TCP | Connection String | State persistence |
| **Firebase Auth** | WebSocket | Admin SDK | User authentication |
| **Frontend** | HTTPS/WSS | JWT | API requests + events |

---

## 🎯 Challenge-Winning Features

### 1️⃣ Native Notion MCP Support
- Direct workspace access without REST limits
- Real-time database queries
- Native MCP client for atomic operations

### 2️⃣ Dual-Mode Integration
- Falls back to Notion REST if MCP unavailable
- Automatic format conversion
- Unified abstraction layer

### 3️⃣ Intelligent Orchestration
- Multi-agent task decomposition
- Gemini-powered intent classification
- Workflow state machine management

### 4️⃣ Production-Ready
- Comprehensive logging (Winston)
- Zod validation on all inputs
- Error recovery & retry logic
- WebSocket event streaming

---

## 🔗 Related Documentation

- **[Frontend Client](../frontend/README.md)** — React UI & hooks
- **[Full Architecture](../ARCHITECTURE.md)** — System design & flows
- **[Quick Start](../docs/QUICK_START.md)** — Development guide
- **[Notion Implementation](../docs/NOTION_INTEGRATION_IMPLEMENTATION_PLAN.md)** — Integration details

---

<div align="center">

### 🌟 Part of the Notion AI Challenge

Built with ❤️ for Major League Hacking

[🚀 LAUNCH DEMO](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge) • [📖 ARCHITECTURE](../ARCHITECTURE.md) • [🎨 Frontend](../frontend/README.md)

</div>
