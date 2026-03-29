# 🎨 ORIN Frontend

### Next.js Client for the **Notion AI Challenge**

<div align="center">

[![🚀 Live Demo](https://img.shields.io/badge/🚀%20LIVE%20DEMO-orin--delta.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![WebSocket](https://img.shields.io/badge/⚡%20WebSocket-Enabled-2ea44f?style=for-the-badge)]()

</div>

---

## 💡 Purpose

Frontend powers the complete ORIN user experience:

- 💬 **Chat Interface** — Natural language command entry
- 🎯 **Intent Recognition** — Real-time feedback as you type
- 📊 **Workflow Dashboard** — Monitor multi-step operations
- 🔄 **Real-Time Updates** — WebSocket-powered event streaming
- 🔗 **Notion Integration** — Seamless context awareness
- 🛡️ **Auth Protection** — Better Auth session management

---

## 🗺️ Key User Surfaces

| Route | Purpose |
|-------|---------|
| `/auth` | Login & signup with OAuth |
| `/onboarding` | Gemini & Notion credential setup |
| `/dashboard` | Main workspace & chat interface |
| `/workflows` | Workflow history & execution controls |
| `/settings` | User preferences & integrations |

---

## 🏗️ Architecture

### App Router
- Centralized providers in `app/layout.tsx`
- Route-based code splitting
- Server/Client component boundaries

### State Management
- **React Query** — Server state & cache invalidation
- **Zustand Stores** — Local UI state (workflows, metrics, alerts, timeline)
- **WebSocket Hook** — Deduped event streaming & reconciliation

### API Communication
- **BFF Proxy** (`proxy.ts`) — Route protection & request rewriting
- **JWT Tokens** — Better Auth cookie + in-memory token
- **Error Boundaries** — Graceful failure handling

### Real-Time Updates
- Enhanced WebSocket hook with deduplication
- Automatic reconnection with exponential backoff
- Event-driven metric updates

---

## 🚀 Local Development

### Prerequisites
- 🦅 Bun or Node.js 20+
- 🖥️ Backend running on port 8000 (default)

### Setup

```bash
cd frontend
bun install
bun run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔧 Environment Variables

Create `frontend/.env.local`:

```env
# API Endpoints
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws

# Optional: Analytics, monitoring, feature flags
# NEXT_PUBLIC_SENTRY_DSN=...
```

---

## 📦 Available Scripts

```bash
bun run dev       # ▶️ Start development server
bun run build     # 🏗️ Build for production
bun run start     # ⚡ Start production server
bun run lint      # 🔍 Run ESLint
```

---

## 📁 Folder Structure

```
app/
├─ layout.tsx              Root layout + providers
├─ page.tsx                Home page
├─ globals.css             Tailwind styles
├─ auth/                   Authentication routes
├─ onboarding/             Setup wizard
├─ dashboard/              Main interface
├─ workflows/              Operation tracking
└─ settings/               User configuration

components/
├─ core/                   Base UI components
├─ features/               Feature-specific components
└─ layout/                 Layout wrappers

hooks/
├─ useAuth.ts              Auth context hook
├─ useEnhancedWebSocket.ts Real-time events
├─ mutations/              Server mutations
└─ queries/                Server queries

lib/
├─ api.ts                  HTTP client with JWT
├─ auth.ts                 Auth utilities
├─ websocket.ts            WebSocket client
└─ types/                  Shared TypeScript types

stores/
├─ useOrinStore.ts         Workflows + state
├─ alerts.store.ts         Alert queue
├─ metrics.store.ts        Timeline metrics
└─ timeline.store.ts       History events

providers/
├─ AuthProvider.tsx        Session context
├─ query-provider.tsx      React Query setup
└─ websocket-provider.tsx  WebSocket context
```

---

## 🔗 Related Documentation

- **[Backend API](../backend/README.md)** — Express endpoints & routes
- **[Full Architecture](../ARCHITECTURE.md)** — System design & data flows
- **[Quick Start Guide](../docs/QUICK_START.md)** — Complete setup walkthrough

---

<div align="center">

### 🌟 Part of the Notion AI Challenge

Built with ❤️ for Major League Hacking

[🚀 LAUNCH DEMO](https://orin-delta.vercel.app/?utm_source=github&utm_campaign=notion-challenge) • [📖 ARCHITECTURE](../ARCHITECTURE.md) • [⭐ Backend](../backend/README.md)

</div>
