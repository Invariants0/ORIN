# Notion MCP vs Notion REST API

Last updated: 2026-03-28

This document compares Notion MCP and the Notion REST API across authentication, capabilities, limitations, and ideal use cases for ORIN.

## Quick Summary

- Notion MCP is a hosted server designed for AI agents and uses OAuth 2.0 with PKCE and discovery.
- Notion REST API is the traditional integration API using OAuth (public integration) or internal integration tokens.
- MCP is best for agent workflows; REST is best for deterministic automation and full CRUD control.
- For ORIN, we should support both: MCP for hackathon requirements and REST for long-term expansion.

## What Is Notion MCP?

Notion MCP is Notion’s hosted Model Context Protocol server. It exposes AI-friendly tools that let an agent search, read, and write within a user’s Notion workspace. MCP is purpose-built for AI assistants and provides structured, agent-optimized responses.

### MCP Endpoints

- Streamable HTTP: `https://mcp.notion.com/mcp`
- SSE fallback: `https://mcp.notion.com/sse`

## What Is Notion REST API?

Notion REST API is the standard integration API for programmatically reading and writing pages, databases, blocks, comments, and more. It is ideal for deterministic automation and backend workflows.

## Authentication

### Notion MCP Auth

- OAuth 2.0 Authorization Code flow with PKCE.
- Requires OAuth discovery (RFC 9470 + RFC 8414) to locate authorization endpoints.
- Supports dynamic client registration.
- Requires interactive user authorization.
- Tokens are issued for MCP access and are not the same as REST tokens.

### Notion REST API Auth

- Public integration OAuth returns an access token (often with `ntn_` prefix).
- Internal integrations can use a secret token without OAuth.
- Tokens are valid only for REST endpoints at `https://api.notion.com/v1/...`.

## Capabilities

### MCP

- AI-optimized tools: search, fetch, create pages, query data.
- Works seamlessly with AI agents and tool calling.
- Can surface Notion + connected sources (if user has Notion AI).

### REST

- Full CRUD on Notion resources.
- Supports deterministic workflows and automation.
- Broadest feature surface.

## Rate Limits and Constraints

- Both MCP and REST respect Notion API rate limits (3 req/sec average per integration).
- MCP tool endpoints can have stricter per-tool limits.
- MCP currently does not support all REST features (e.g., some file operations).

## Pros and Cons

### Notion MCP

Pros:
- Built for AI agents and tool calling.
- Structured outputs for AI reasoning.
- Hosted by Notion (no server hosting needed).

Cons:
- Must use OAuth + PKCE with interactive user authorization.
- Token cannot be reused for REST API.
- Not all REST features are exposed through MCP tools.

### Notion REST API

Pros:
- Full control over Notion resources.
- Works for automation and backend workflows.
- Supports internal integration tokens.

Cons:
- Not optimized for AI tool usage.
- Manual data shaping required.

## Recommended ORIN Strategy

We should keep both flows and store tokens separately:

- `notionRestAccessToken`
- `notionRestRefreshToken`
- `notionMcpAccessToken`
- `notionMcpRefreshToken`
- `notionMcpExpiresAt`

Usage:

- Use MCP tokens for agent tool calls and context retrieval.
- Use REST tokens for deterministic backend operations or long-term features not available in MCP.

## Decision

For the hackathon requirement (Notion MCP), we must implement the MCP OAuth flow and connect to `https://mcp.notion.com/mcp`. The current REST OAuth flow should remain as an optional capability for long-term use.

