# Notion MCP Integration (ORIN)

## Purpose
This project uses Notion MCP to satisfy the Notion MCP Challenge requirements. MCP is now the default Notion provider in the backend when `NOTION_PROVIDER=mcp`.

## How It Works
- `notion-mcp.client.ts` connects to the Notion MCP server using Streamable HTTP (falls back to SSE).
- `notion-mcp.service.ts` wraps common actions (create page, search, fetch).
- `notion-write.service.ts` and `context-retrieval.service.ts` route through MCP when enabled.

## Environment Variables
Add to `backend/.env`:
```
NOTION_PROVIDER=mcp
NOTION_MCP_URL=https://mcp.notion.com/mcp
NOTION_MCP_TOKEN=your_notion_mcp_access_token
NOTION_MCP_PARENT_PAGE_ID=
NOTION_DATABASE_ID=your_database_id_optional
NOTION_OAUTH_CLIENT_ID=
NOTION_OAUTH_CLIENT_SECRET=
NOTION_OAUTH_REDIRECT_URI=http://localhost:8000/api/notion/oauth/callback
NOTION_OAUTH_AUTHORIZE_URL=https://api.notion.com/v1/oauth/authorize
NOTION_OAUTH_TOKEN_URL=https://api.notion.com/v1/oauth/token
NOTION_OAUTH_SUCCESS_REDIRECT=http://localhost:3000
NOTION_VERSION=2022-06-28
```

## OAuth Flow (User Token)
ORIN supports a full OAuth authorization-code flow to obtain a user-scoped Notion token and store it in the database.

Backend endpoints:
- `GET /api/notion/oauth/start` — requires auth, redirects to Notion OAuth consent page.
- `GET /api/notion/oauth/callback` — exchanges `code` for a token and stores it.
- `GET /api/notion/oauth/status` — returns `{ connected: boolean }`.
- `POST /api/notion/oauth/disconnect` — clears the stored token.

Frontend:
- Settings → Connections → Notion → Connect uses `/api/notion/oauth/start`.
- Disconnect clears the token locally.

## Demo Flow
1. Send `/store` in the chat.
2. The orchestrator writes to Notion via MCP.
3. A real Notion page is created and returned.

## Notes
- MCP auth uses a bearer token (`NOTION_MCP_TOKEN`). For production, obtain this via Notion MCP OAuth.
- REST integration remains available by setting `NOTION_PROVIDER=rest`.
