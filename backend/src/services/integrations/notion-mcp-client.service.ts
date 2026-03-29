/**
 * Notion MCP Client Service
 * 
 * Implements proper MCP client per Notion's official guide:
 * https://developers.notion.com/guides/mcp/build-mcp-client
 * 
 * Key differences from REST API:
 * - Uses @modelcontextprotocol/sdk, NOT @notionhq/client
 * - Uses Bearer token authentication (not API key)
 * - Token expires in 1 hour (not stored expiry - check on use)
 * - Tokens automatically rotate on refresh
 * - Streamable HTTP first, SSE fallback
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  SSEClientTransport,
} from "@modelcontextprotocol/sdk/client/sse.js";
import logger from "@/config/logger.js";
import db from "@/config/database.js";
import notionMcpOauthService from "@/services/integrations/notion-mcp-oauth.service.js";

interface McpClientSession {
  client: Client;
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenObtainedAt: number;
}

/**
 * Manages MCP client connections with automatic token refresh
 */
class NotionMcpClientService {
  // In-memory session cache for active MCP clients
  private clientSessions = new Map<string, McpClientSession>();
  
  // Locks to prevent concurrent session creation for same user
  private sessionCreationLocks = new Map<string, Promise<Client>>();

  /**
   * Get or create an authenticated MCP client for a user
   */
  async getAuthenticatedClient(userId: string): Promise<Client> {
    // Check if we have a cached session
    const cached = this.clientSessions.get(userId);
    if (cached) {
      // Reconnect with fresh token (1 hour expiry)
      const ageMs = Date.now() - cached.tokenObtainedAt;
      const isExpired = ageMs > 55 * 60 * 1000; // Refresh at 55 minutes

      if (!isExpired) {
        logger.debug("[Notion MCP] Using cached client", { userId });
        return cached.client;
      }

      // Token is stale, refresh it
      logger.info("[Notion MCP] Token approaching expiry, refreshing", { userId });
      await this.refreshAndReconnect(cached);
      return cached.client;
    }

    // Prevent concurrent session creation for same user
    const existingLock = this.sessionCreationLocks.get(userId);
    if (existingLock) {
      logger.debug("[Notion MCP] Waiting for concurrent session creation", { userId });
      return existingLock;
    }

    // Create new session with lock
    const creationPromise = this.createNewSession(userId);
    this.sessionCreationLocks.set(userId, creationPromise);

    try {
      const client = await creationPromise;
      return client;
    } finally {
      // Remove lock after session is created
      this.sessionCreationLocks.delete(userId);
    }
  }

  /**
   * Create a new authenticated MCP client session
   */
  private async createNewSession(userId: string): Promise<Client> {
    logger.info("[Notion MCP] Creating new client session", { userId });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        notionMcpAccessToken: true,
        notionMcpRefreshToken: true,
      },
    });

    if (!user?.notionMcpAccessToken) {
      throw new Error(
        "Notion MCP token not configured. Please reconnect in Settings."
      );
    }

    const client = await this.connectToMcp(user.notionMcpAccessToken);

    // Cache the session
    this.clientSessions.set(userId, {
      client,
      userId,
      accessToken: user.notionMcpAccessToken,
      refreshToken: user.notionMcpRefreshToken || "",
      tokenObtainedAt: Date.now(),
    });

    return client;
  }

  /**
   * Refresh token and reconnect with new credentials
   */
  private async refreshAndReconnect(session: McpClientSession): Promise<void> {
    if (!session.refreshToken) {
      logger.warn("[Notion MCP] No refresh token available", { 
        userId: session.userId 
      });
      // Remove stale session
      this.clientSessions.delete(session.userId);
      throw new Error("Cannot refresh token - no refresh token available");
    }

    try {
      const tokens = await notionMcpOauthService.refreshAccessToken(
        session.userId
      );

      if (!tokens?.access_token) {
        throw new Error("Token refresh returned no access token");
      }

      logger.info("[Notion MCP] Token refreshed successfully", {
        userId: session.userId,
      });

      // Update session with new tokens
      session.accessToken = tokens.access_token;
      session.refreshToken = tokens.refresh_token || session.refreshToken;
      session.tokenObtainedAt = Date.now();

      // Disconnect old client
      try {
        await session.client.close();
      } catch (e) {
        logger.warn("[Notion MCP] Error closing old client", { error: e });
      }

      // Create new client with refreshed token
      const newClient = await this.connectToMcp(tokens.access_token);
      session.client = newClient;
    } catch (error) {
      logger.error("[Notion MCP] Token refresh failed", { 
        userId: session.userId, 
        error 
      });
      this.clientSessions.delete(session.userId);
      throw error;
    }
  }

  /**
   * Connect to Notion MCP server with authentication
   * Tries Streamable HTTP first, falls back to SSE
   */
  private async connectToMcp(accessToken: string): Promise<Client> {
    const serverUrl = "https://mcp.notion.com";
    
    const client = new Client(
      {
        name: "orin-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          roots: {},
          sampling: {},
        },
      }
    );

    // Create a custom fetch that includes Bearer token
    const fetchWithAuth = (url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("User-Agent", "ORIN-MCP-Client/1.0");
      
      return fetch(url, {
        ...init,
        headers,
      });
    };

    // Try Streamable HTTP first (recommended)
    try {
      logger.debug("[Notion MCP] Attempting Streamable HTTP connection");
      const transport = new StreamableHTTPClientTransport(
        new URL(`${serverUrl}/mcp`),
        {
          fetch: fetchWithAuth as any,
        }
      );
      await client.connect(transport);
      logger.info("[Notion MCP] Connected via Streamable HTTP");
      return client;
    } catch (error) {
      logger.warn("[Notion MCP] Streamable HTTP failed, trying SSE", { error });

      // Fall back to SSE
      try {
        const transport = new SSEClientTransport(
          new URL(`${serverUrl}/sse`),
          {
            fetch: fetchWithAuth as any,
          }
        );
        await client.connect(transport);
        logger.info("[Notion MCP] Connected via SSE");
        return client;
      } catch (sseError) {
        logger.error("[Notion MCP] Both connection methods failed", {
          streamHttpError: error,
          sseError,
        });
        throw new Error(
          `Failed to connect to Notion MCP: ${sseError}`
        );
      }
    }
  }

  /**
   * Execute any MCP tool
   */
  async executeTool(
    userId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const client = await this.getAuthenticatedClient(userId);

    try {
      logger.info("[Notion MCP] Executing tool", { 
        userId, 
        toolName, 
        args: JSON.stringify(args).substring(0, 100) + '...'
      });

      const response = await client.callTool({
        name: toolName,
        arguments: args,
      });

      return response;
    } catch (error) {
      logger.error("[Notion MCP] Tool execution failed", { 
        userId, 
        toolName, 
        error 
      });
      throw error;
    }
  }

  /**
   * Create a page via MCP
   * Example from Notion docs
   */
  async createPage(
    userId: string,
    pageTitle: string,
    content?: string
  ): Promise<any> {
    const client = await this.getAuthenticatedClient(userId);

    try {
      logger.info("[Notion MCP] Creating page", { userId, pageTitle });

      // Call the notion-create-pages tool
      const response = await client.callTool({
        name: "notion-create-pages",
        arguments: {
          pages: [
            {
              properties: { title: pageTitle },
              content: content || "",
            },
          ],
        },
      });

      logger.info("[Notion MCP] Page created successfully", { 
        userId, 
        pageTitle 
      });
      return response;
    } catch (error) {
      logger.error("[Notion MCP] Page creation failed", { 
        userId, 
        pageTitle, 
        error 
      });
      throw error;
    }
  }

  /**
   * List user pages via MCP
   */
  async listPages(userId: string): Promise<any> {
    const client = await this.getAuthenticatedClient(userId);

    try {
      logger.info("[Notion MCP] Listing pages", { userId });

      // Get available tools
      const response = await client.listTools();

      logger.info("[Notion MCP] Available tools", { 
        count: response.tools.length 
      });
      return response.tools;
    } catch (error) {
      logger.error("[Notion MCP] Page listing failed", { userId, error });
      throw error;
    }
  }

  /**
   * Close a user's MCP session
   */
  async closeSession(userId: string): Promise<void> {
    const session = this.clientSessions.get(userId);
    if (!session) return;

    try {
      await session.client.close();
      logger.info("[Notion MCP] Session closed", { userId });
    } catch (error) {
      logger.warn("[Notion MCP] Error closing session", { userId, error });
    } finally {
      this.clientSessions.delete(userId);
    }
  }

  /**
   * Close all active sessions (useful for shutdown)
   */
  async closeAllSessions(): Promise<void> {
    const promises = Array.from(this.clientSessions.keys()).map((userId) =>
      this.closeSession(userId)
    );
    await Promise.all(promises);
    logger.info("[Notion MCP] All sessions closed");
  }
}

export const notionMcpClientService = new NotionMcpClientService();
export default notionMcpClientService;
