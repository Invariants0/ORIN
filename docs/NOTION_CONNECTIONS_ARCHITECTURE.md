# Notion Connections Architecture (MCP + REST)

Last updated: 2026-03-28

This document defines how ORIN should support both Notion MCP and the Notion REST API without conflicts, including auth flows, data separation, and call routing.

## Goals

- Support both Notion MCP and Notion REST API in parallel.
- Keep tokens isolated so there is no cross-use or confusion.
- Allow users to connect either or both, and show status independently.
- Use MCP for agent reasoning and context retrieval; use REST for deterministic CRUD and long-term capabilities.

## High-Level Architecture

```
User -> ORIN UI
  -> Connect Notion (REST OAuth) -> Notion REST API (api.notion.com)
  -> Connect Notion (MCP OAuth)  -> Notion MCP Server (mcp.notion.com)

ORIN Backend
  - Stores REST tokens separately from MCP tokens
  - Routes calls to REST or MCP based on intent and tool needs
```

## Connection Surfaces

- REST OAuth button: for traditional Notion API integration.
- MCP OAuth button: for agent context retrieval and tool calls.
- Both can be connected at the same time.

## Auth Flows

### REST OAuth (Public Integration)

Notion REST OAuth is the standard OAuth flow for public integrations. The steps include:

1. Redirect user to the Notion authorization URL (`https://api.notion.com/v1/oauth/authorize`).
2. Receive an authorization `code` on the redirect URI.
3. Exchange `code` at `https://api.notion.com/v1/oauth/token` to get `access_token` + `refresh_token`.
4. Store tokens for REST API use.

Reference: Notion authentication guidance for bearer tokens and OAuth access tokens. citeturn1search0

REST API requests use bearer tokens plus a `Notion-Version` header. citeturn1search1

### MCP OAuth (PKCE + Discovery)

Notion MCP uses a dedicated OAuth 2.0 flow with PKCE, discovered dynamically:

1. Discover OAuth metadata using protected resource + authorization server metadata.
2. Generate PKCE code verifier + challenge.
3. Optionally register a client dynamically.
4. Authorize the user, then exchange code for tokens.
5. Connect to MCP using `https://mcp.notion.com/mcp` (or `.../sse` fallback).

Notion's MCP guide explicitly calls out OAuth + PKCE and these endpoints. citeturn2view0

## Token Separation (No Conflicts)

Store MCP tokens and REST tokens separately in the database:

- `notionRestAccessToken`
- `notionRestRefreshToken`
- `notionMcpAccessToken`
- `notionMcpRefreshToken`
- `notionMcpExpiresAt`

This prevents using a REST token on MCP (or vice versa), which can produce auth failures.

## Routing Strategy

### Use MCP when:

- Intent is "query" or "search" across workspace memory.
- We need agent-friendly, structured responses.
- Tooling maps to MCP tools (e.g., `notion-search`, `notion-fetch`).

### Use REST when:

- We need full CRUD operations not yet covered by MCP tools.
- We need deterministic updates or automation.
- We need endpoints that MCP does not expose (e.g., some file/media operations).

## Rate Limits

Both MCP and REST are still bound by Notion's API request limits: average 3 requests per second per integration, with bursts allowed. citeturn0search0

## Recommended UI Behavior

- In Settings -> Connections, show two distinct Notion cards or two buttons:
  - "Notion REST"
  - "Notion MCP"
- Each should show its own connection badge and disconnect action.
- Do not auto-connect both flows unless explicitly desired.

## Security Notes

- Never reuse tokens across REST/MCP.
- Store tokens encrypted at rest (or in DB with access constraints).
- Refresh tokens should be rotated and updated when new access tokens are issued.

## Open Implementation Tasks (Next)

- Add MCP OAuth endpoints (PKCE + discovery).
- Extend user model with MCP token fields.
- Update Settings UI to display MCP connection state.
- Route MCP calls using stored MCP token.
