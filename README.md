# 🧠 ORIN

### Context Operating System powered by **Notion MCP** + **Gemini AI**

<div align="center">

[![🚀 Live Demo](https://img.shields.io/badge/🚀%20LIVE%20DEMO-orin--delta.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white&labelColor=000000)](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge)

[![🏆 Notion AI Challenge](https://img.shields.io/badge/🏆%20NOTION%20AI%20CHALLENGE-Major%20League%20Hacking-FF6B35?style=for-the-badge)](https://mlh.io)
[![⭐ Status](https://img.shields.io/badge/⭐%20STATUS-ACTIVE%20SUBMISSION-blue?style=for-the-badge)]()
[![📦 Repo Type](https://img.shields.io/badge/📦%20REPO%20TYPE-Monorepo-6f42c1?style=for-the-badge)]()
[![⚖️ License](https://img.shields.io/badge/⚖️%20LICENSE-ISC-green?style=for-the-badge)]()

</div>

---

## 🎯 The Problem

Your work is scattered across multiple tools:
- 💻 Code in an editor
- 📝 Plans in docs
- ✅ Tasks in messages
- 📧 Email reminders
- 📅 Calendar commitments

**The Reality:** Most AI tools sit outside of all of it, just *guessing* what you actually want.

**We know there's a better way:** When AI can use your context—and run across multiple tools you use every day—like Notion.

---

## 🚀 The Challenge

**Notion is partnering with Major League Hacking to issue a challenge to hackers around the globe:**

### Build the Most Impressive System Using Notion MCP

✅ Can be across any field: engineering, sales, finance, etc.  
✅ We want to see your **sick integrations**!  
✅ Show us the workflow that makes you feel like you have **superpowers**

🔗 **[Official Challenge Page](https://events.mlh.io/events/13841-the-notion-ai-challenge)**

### 🎨 Judging Criteria
- ⭐ **Originality & Creativity** — Unique ideas and execution
- ⚙️ **Technical Complexity** — Sophisticated implementation
- 🎯 **Use of Underlying Technology** — Deep Notion MCP integration

---

## 💡 What ORIN Is

ORIN transforms Notion into a living memory layer and execution engine on top of natural conversation.

### Core Features
- 🎯 **Intent Understanding** — Parse natural language commands
- 💾 **Context Memory** — Store and retrieve structured information  
- 📋 **Task Decomposition** — Break goals into actionable steps
- ⚡ **Workflow Execution** — Execute and monitor tasks in real time
- 🔌 **Dual Notion Integration** — Notion REST API + Native Notion MCP (Model Context Protocol)

### Why This Matters
Most AI tools sit outside your workflow, blind to your context. ORIN changes that: When AI can directly access and manipulate your Notion workspace—reading pages, creating tasks, updating databases—you get superpowers. Your context is immediately available. Your workflows become ambient.

---

## 🌟 Live Experience

### ✨ Try the Demo
👉 **[Launch ORIN](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge)**

### 📸 What You Can Do
1. **Chat with Intent** — Tell ORIN to "organize my project tasks"
2. **Watch It Execute** — See AI decompose, plan, and execute in Notion
3. **Track Workflows** — Monitor multi-step operations in real time
4. **Iterate Seamlessly** — Resume, modify, and re-run workflows

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, React Query, Zustand |
| **Backend** | Express 5, TypeScript 5, Prisma ORM, Better Auth, Winston Logging, WebSocket |
| **AI/Integration** | Google Gemini API, Notion REST OAuth, Notion MCP OAuth + Client |
| **Deployment** | Vercel (frontend), Render-ready (backend), PostgreSQL |

---

## 🏗️ System Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Intent (Chat + Commands)                              │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│  Frontend: Next.js App → BFF Proxy Router                    │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│  Backend: Orchestrator                                       │
│  (Intent Classifier, Task Decomposer, Executor)             │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼──┐   ┌────▼────┐   ┌──▼──────┐
│ MCP  │   │ REST    │   │ Gemini  │
│Notion│   │Notion   │   │  API    │
└──────┘   └─────────┘   └─────────┘
    │            │            │
    └────┬───────┴────┬───────┘
         │            │
    ┌────▼────────────▼────┐
    │ Prisma (PostgreSQL)  │
    │ State Persistence    │
    └──────────────────────┘
```

For detailed technical architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).


---

## 🚀 Quick Start

### Prerequisites
- 🦅 Bun or Node.js 20+
- 🔑 Google Gemini API key
- 📚 Database (SQLite for local, PostgreSQL for production)
- 🔗 Notion OAuth credentials (optional, for REST API)
- 🤖 Notion MCP OAuth credentials (optional, for native MCP)

### 1️⃣ Start Backend
```bash
cd backend
bun install
bunx prisma generate
bun run dev
```

### 2️⃣ Start Frontend
```bash
cd frontend
bun install
bun run dev
```

### 3️⃣ Open App
- 🎨 **Frontend:** http://localhost:3000
- 💚 **Health Check:** http://localhost:8000/api/health

---

## 📋 Environment Setup

### Backend Minimum Requirements

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

### Frontend Minimum Requirements

```env
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 📚 Project Structure

```
ORIN/
├─ 🎨 frontend/          Next.js app, React components, WebSocket client
├─ ⚙️  backend/           Express API, orchestrator, workflow runner
├─ 📖 docs/              Architecture, integration, and design docs
├─ 📋 ARCHITECTURE.md    Canonical system design document
├─ 📝 CHANGES_SUMMARY.md Recent updates
└─ ⚖️  LICENSE            ISC License
```

---

## 📖 Documentation

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system design, data flows, integration patterns |
| [docs/QUICK_START.md](docs/QUICK_START.md) | Developer onboarding guide |
| [docs/NOTION_INTEGRATION_IMPLEMENTATION_PLAN.md](docs/NOTION_INTEGRATION_IMPLEMENTATION_PLAN.md) | Notion REST + MCP implementation details |
| [docs/ORIN–PRD.md](docs/ORIN–PRD.md) | Product requirements & vision |
| [frontend/README.md](frontend/README.md) | Frontend architecture & setup |
| [backend/README.md](backend/README.md) | Backend API routes & configuration |

---

## 🎪 Notion MCP Challenge Submission

### ✅ Why ORIN Wins This Challenge

1. **🎨 Originality & Creativity**
   - First system to bridge Notion MCP + Gemini for ambient AI
   - Dual-mode integration (REST + native MCP)
   - Voice/chat + multi-step workflow execution

2. **⚙️ Technical Complexity**
   - BFF proxy pattern for secure API routing
   - Real-time WebSocket event streaming
   - Multi-agent task decomposition engine
   - Gemini intent classification + context memory
   - Notion MCP OAuth + native protocol client

3. **🚀 Use of Underlying Technology**
   - Deep Notion MCP integration (reading, writing, querying)
   - Notion REST OAuth for fallback + interop
   - Gemini for intent parsing and plan generation
   - Full workspace context access for ambient awareness

### 🏆 Judge's Takeaway

ORIN shows what's possible when AI has **native access to your workspace**. No API rate limits, no guessing—just direct, ambient intelligence that evolves with your Notion setup.

---

## 🔗 Links

- **🚀 [Live Demo](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge)** — Try ORIN now
- **💬 [GitHub Issues](https://github.com)** — Report bugs or request features
- **📧 Challenge Info** — [Notion AI Challenge on MLH](https://mlh.io)
- **👤 Built by:** Akshad J. for Major League Hacking

---

<div align="center">

### 🌟 Made for the Notion AI Challenge

**Submissions close March 29, 2026 at 11:59 PM PST**

[🚀 LAUNCH DEMO](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge) • [📖 READ DOCS](ARCHITECTURE.md) • [⭐ Star on GitHub](#)

</div>
