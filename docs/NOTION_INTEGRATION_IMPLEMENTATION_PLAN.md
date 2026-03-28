# Notion MCP + REST Integration Plan (End-to-End Flow)

Last updated: 2026-03-28

This document defines the end-to-end implementation plan, architecture, and request flow for supporting both Notion REST OAuth and Notion MCP OAuth in ORIN without conflicts.

## 1) Goals

- Support **both** Notion REST API and Notion MCP in parallel.
- Keep tokens isolated and prevent cross-use.
- Provide explicit, predictable routing per feature (no intent-based auto-routing).
- Deliver a clean user experience with two separate connection buttons.

## 2) Architecture Overview

```
Frontend (Settings -> Connections)
  |-- Connect Notion REST  -> /api/notion/oauth/start
  |-- Connect Notion MCP   -> /api/notion/mcp/oauth/start

Backend
  - notion-oauth.*        (REST OAuth flow)
  - notion-mcp-oauth.*    (MCP OAuth + PKCE + discovery)
  - notion-mcp.client     (MCP tool calls)
  - notion-rest.client    (REST API calls)
  - orchestrator/services (explicit routing per feature)
```

## 2.1) MCP vs REST API Capability Matrix (Key Differences)

This is a focused, non-exhaustive comparison of practical capabilities we care about for ORIN.

| Capability | MCP | REST API |
|---|---|---|
| Semantic search across workspace | Yes (tool: `notion-search`) | Limited (manual query/search logic) |
| Fetch page/database by ID/URL | Yes (tool: `notion-fetch`) | Yes (retrieve page/database endpoints) |
| Create pages | Yes (tool: `notion-create-pages`) | Yes (create page endpoint) |
| Update page properties / blocks | Partial (tool coverage limited) | Yes (full block/page update APIs) |
| Database queries (structured filters) | Yes (via MCP query data sources) | Yes (query database endpoint) |
| Files/media upload to Notion | Not supported / limited | Yes (REST supports file blocks via external URLs; direct upload via API is limited but broader than MCP) |
| External tool aggregation (Notion AI + connected sources) | Yes (if user has Notion AI) | No (REST is Notion-only) |
| Fine-grained CRUD control | Limited (tool set constrained) | Full REST CRUD surface |
| Best fit | Agent reasoning + context retrieval | Deterministic backend automation |

Notes:
- MCP tools are intentionally scoped to AI workflows.
- REST remains the source of truth for full CRUD and edge-case operations not exposed in MCP tools.

## 3) Data Model Changes

Add separate fields on `User` (or integration table later):

- `notionRestAccessToken`
- `notionRestRefreshToken`
- `notionMcpAccessToken`
- `notionMcpRefreshToken`
- `notionMcpExpiresAt`

Optional transition: keep legacy `notionToken` temporarily as alias for REST access token.

## 4) OAuth Flows

### A) REST OAuth (Public Integration)

1. `GET /api/notion/oauth/start`  
   - build authorization URL  
   - include state (signed, with userId + returnTo)
2. Redirect to Notion REST OAuth screen
3. Callback `GET /api/notion/oauth/callback`
4. Exchange code at `https://api.notion.com/v1/oauth/token`
5. Store REST access + refresh token
6. Redirect user to `/settings?notion=connected`

### B) MCP OAuth (PKCE + Discovery)

1. `GET /api/notion/mcp/oauth/start`
   - fetch protected resource metadata
   - fetch auth server metadata
   - generate PKCE verifier + challenge
   - dynamically register client (if required)
   - create authorization URL with PKCE
2. Redirect to MCP authorization screen
3. Callback `GET /api/notion/mcp/oauth/callback`
4. Exchange code + verifier for MCP token
5. Store MCP access + refresh token + expiry
6. Redirect user to `/settings?notionMcp=connected`

## 5) Explicit Routing Strategy (No Auto-Intent Routing)

All routing decisions are explicit in code:

| Feature | Integration | Reason |
|---|---|---|
| Context retrieval (search/fetch for agent replies) | MCP | Structured tool responses for agents |
| Store classified content into Notion | REST (initially) | Deterministic REST writes + broader feature surface |
| Future file/media or advanced CRUD | REST | REST supports broader endpoints |
| Agent-only flows (tasking, search across sources) | MCP | MCP built for AI tool usage |

If MCP is disconnected, the MCP-only features should show a connection prompt instead of silently falling back to REST.

## 6) End-to-End Request Flow

### Store Flow (Example)

```
User -> Orchestrator -> Content classification -> REST create page
  - Uses notionRestAccessToken
```

### Query Flow (Example)

```
User -> Orchestrator -> MCP search -> MCP fetch -> Gemini answer
  - Uses notionMcpAccessToken
```

### Generate Doc Flow (Example)

```
User -> Orchestrator -> Gemini doc generation -> REST create page
  - Uses notionRestAccessToken
```

## 7) Failure Handling

- If MCP token is missing or invalid:
  - Return a clear “Connect Notion MCP” response.
- If REST token is missing:
  - Return a clear “Connect Notion REST” response.
- Do not swap or fallback automatically across integrations.

## 8) Frontend UX Requirements

Settings -> Connections:
- Show two Notion rows or two buttons in the Notion card:
  - “Notion REST”
  - “Notion MCP”
- Each has its own connection badge and disconnect action.
- Do not gray out one when the other connects.

## 9) Implementation Checklist

Backend:
- Add MCP OAuth service + controller + routes.
- Add DB fields for MCP tokens.
- Update REST OAuth to write REST-specific fields.
- Add MCP token usage to `notion-mcp.client`.

Frontend:
- Add MCP connection button to Settings.
- Display independent connection status for REST and MCP.

## 10) Validation

- REST OAuth flow completes and REST API calls succeed.
- MCP OAuth flow completes and MCP tool calls succeed.
- Disconnecting one integration does not affect the other.
