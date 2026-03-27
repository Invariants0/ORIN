# ORIN Project Status & Architecture Report

*Generated for AI Context Injection*
**Current Phase:** Phase 4 (Integration & Backend Alignment) completed. Moving to Phase 5 (Authentication).

---

## 🏗️ 1. The Big Refactor (State Management & Architecture)

We have completed a massive overhaul of the frontend architecture to move it from a "mocked/prototype" state into a **Production-Grade, Server-Driven Application**.

### The Old Architecture (Deprecated & Removed)

- **Tug-of-War State:** Previously, the app relied heavily on global Zustand stores (`workflow.store.ts`) holding massive amounts of data, which constantly desynced from the backend.
- **Mock Polling:** Components like `OrinChatInput` were faking API requests with `setTimeout` loops to simulate execution steps.
- **Dead Code:** Files like `useWebSocket.ts` and `useWorkflowSelectors.ts` were fragmented and caused race conditions.

### The New Architecture (TanStack Query + Axios)

1. **Server State is King:** We migrated the entire application to use **TanStack React Query** (`@tanstack/react-query`) for all server-state.
2. **Zustand is Ephemeral:** Zustand is now strictly used for ephemeral UI state only (e.g., `mode`, `currentSessionId`, active tabs).
3. **Reactive WebSockets:** We built `useEnhancedWebSocket.ts` which listens to backend Socket events and directly mutates the TanStack query cache (`queryClient.setQueryData`). This allows the entire UI to instantly re-render when the server pushes an update without needing manual global state bridges.
4. **Clean API Layer:** We abandoned scattered `fetch` calls. Everything now routes through an `Axios` instance (`lib/api/client.ts`) with global interceptors.

---

## 🗂️ 2. New Codebase Structure (The "Engine" Pattern)

We restructured the frontend to enforce extreme separation of concerns. The code is now strictly grouped by domain:

### `frontend/lib/api/` (The Network Contract)

- `client.ts` (Global Axios instance)
- **`/types/`** (Strict TypeScript interfaces mirroring the Express backend)
  - `autonomy.api.types.ts`
  - `evolution.api.types.ts`
  - `multi-agent.api.types.ts`
  - `intent.api.types.ts`
- **`/endpoints/`** (The execution functions)
  - `workflow.api.ts`, `autonomy.api.ts`, `chat.api.ts`, `intent.api.ts`, `multi-agent.api.ts`, `evolution.api.ts`

### `frontend/hooks/queries/` (The Data Layer)

- `query-keys.ts` (Centralized TanStack Query cache key factory)
- `useWorkflowQueries.ts`
- `useAutonomyQueries.ts`
- `useEvolutionQueries.ts`
- `useMultiAgentQueries.ts`
- `useIntentQueries.ts`

---

## ⚙️ 3. Backend-to-Frontend API Rectification (Tech Debt Fixed)

We audited the entire Express backend and discovered massive discrepancies where the frontend was calling routes that did not exist. **These have all been fixed:**

1. **The Chat Disconnect (FIXED ✅):**
   - *Old:* Frontend called `POST /commands` and `GET /commands/:id`.
   - *Fix:* Deleted `CommandApi`. The backend uses an Orchestrator service. We rewrote `OrinChatInput.tsx` to hit `POST /api/v1/message`. It no longer polls streaming logs; it now natively consumes the Orchestrator's `{ intent, output, actions }` JSON response and maps it to the chat bubbles.
2. **The Autonomy Disconnect (FIXED ✅):**
   - *Old:* Frontend executed actions blindly to `POST /api/v1/autonomy/execute`.
   - *Fix:* Rewrote hooks to hit the actual backend mechanisms (`POST /api/autonomy/approve/:id` and `POST /autonomy/undo/:id`) and removed the invalid `/v1` prefix.

*(A detailed mapping of all APIs exists in `api.md`)*.

---

## 🚀 4. What's Completed & Working

- **Workflow Monitor Dashboard:** 100% wired up to Live Data. Live Metrics, Health Statuses, active workflow cards, and Pause/Cancel mutations are rendering successfully.
- **Neo-Brutalist UI:** Components have been restyled with thick black borders, hard shadows, and high-contrast colors matching the brand identity.
- **Orchestrator Chat System:** Dynamic intent routing via the chat input (`OrinChatInput.tsx`) is executing queries over the backend Orchestrator service.
- **Advanced Agent Hooks:** We built all the React Hooks needed to control your system's advanced features:
  - `useMultiAgentStats()`, `useExecuteSwarmQuery()`
  - `useAutonomyPolicies()`, `useEmergencyStop()`
  - `useOptimizeSystem()`, `useEvolutionInsights()`

---

## 🟡 5. What's Missing / Next Priorities

If you are feeding this into an AI for context on what to build next, here are the exact tasks missing:

### Priority 1: Authentication Layer (Phase 5)

- **Status:** Empty.
- **To-Do:** The backend `chat.controller.ts` is currently hardcoding `userId = 'anonymous'`. You need to build a real JWT Auth system on the Express backend (`auth.routes.ts`) and create an `<AuthProvider>` in Next.js to wrap the application and guard routes.

### Priority 2: Visual Dashboards for Advanced Agents

- **Status:** We wrote all the data hooks for Multi-Agent logic and Evolution self-learning yesterday (`useEvolutionQueries.ts`, `useMultiAgentQueries.ts`), **but we have not built the UI to actually display them to the user.**
- **To-Do:** Build a new "Swarm / Agent Engine" dashboard that consumes these hooks to show live stats of how the agents are behaving and evolving.

### Priority 3: Session History UI

- **Status:** Backend handles history (`GET /api/v1/sessions`). Frontend has the hooks.
- **To-Do:** The Next.js `<OrinSidebar>` component needs to be rewritten to rip out local mocked history and render actual `ChatApi.getSessions()` data so the user can navigate past conversations.

---

## 📂 6. File Changelog (Git Status Overview)

For complete situational awareness, here is the exact list of files added, modified, or removed during this architectural phase.

### Added (New Files & Endpoints)

- **`PROJECT_STATUS.md`** & **`api.md`** *(Core mapping and status docs)*
- **`frontend/lib/api/types/*`**
  - `workflow.api.types.ts`, `autonomy.api.types.ts`, `evolution.api.types.ts`, `intent.api.types.ts`, `multi-agent.api.types.ts`
- **`frontend/lib/api/endpoints/*`**
  - `workflow.api.ts`, `autonomy.api.ts`, `chat.api.ts`, `evolution.api.ts`, `intent.api.ts`, `multi-agent.api.ts`
- **`frontend/hooks/queries/*`**
  - `query-keys.ts` *(Centralized TanStack cache key factory)*
  - `useAutonomyQueries.ts`, `useEvolutionQueries.ts`, `useIntentQueries.ts`, `useMultiAgentQueries.ts`

### Modified (Refactored for TanStack or Orchestrator API)

- **`frontend/app/workflows/page.tsx`** & **`frontend/app/workflows/[id]/page.tsx`**
- **`frontend/components/features/chat/OrinChatInput.tsx`** *(Rewritten to hit POST /api/v1/message instead of polling)*
- **`frontend/components/features/system/ConnectionIndicator.tsx`**
- **`frontend/hooks/intelligence/useHealthMonitor.ts`** *(Migrated off Zustand)*
- **`frontend/hooks/queries/useWorkflowQueries.ts`**
- **`frontend/hooks/useEnhancedWebSocket.ts`**
- **Zustand Stores (Stripped of server state):**
  - `frontend/stores/workflow.store.ts`
  - `frontend/stores/autonomy.store.ts`
  - `frontend/stores/useOrinStore.ts` *(Added failed statuses and orchestrator metadata fields)*

### Deleted (Removed Tech Debt & Dead Logic)

- ❌ **`frontend/hooks/useWebSocket.ts`** *(Deprecated by useEnhancedWebSocket)*
- ❌ **`frontend/hooks/useWorkflowSelectors.ts`** *(Deprecated by TanStack hooks)*
- ❌ **`frontend/lib/api/endpoints/command.api.ts`** *(Backend Orchestrator handles this via chat now)*
- ❌ **`frontend/lib/api/types/command.api.types.ts`**
- ❌ **`frontend/hooks/queries/useCommandQueries.ts`**
- ❌ **`frontend/hooks/mutations/useCommandMutations.ts`**
