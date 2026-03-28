import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import { NotionPermissionError, NotionConnectionError, isNotionPermissionError, logNotionError } from "@/utils/notion-errors.js";
import { withRetry } from "@/utils/retry.js";

class NotionMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | SSEClientTransport | null = null;
  private connecting: Promise<void> | null = null;
  private activeToken: string | null = null;

  private getAuthHeader(tokenOverride?: string): string {
    const token = tokenOverride || envVars.NOTION_MCP_TOKEN;
    if (!token) {
      throw new Error("NOTION_MCP_TOKEN is not configured");
    }
    return `Bearer ${token}`;
  }

  private buildRequestInit(tokenOverride?: string): RequestInit {
    return {
      headers: {
        Authorization: this.getAuthHeader(tokenOverride)
      }
    };
  }

  private buildEventSourceInit(tokenOverride?: string) {
    return {
      fetch: (url: string | URL, init?: RequestInit) => {
        const headers = {
          ...(init?.headers || {}),
          Authorization: this.getAuthHeader(tokenOverride),
          Accept: "text/event-stream"
        };
        return fetch(url, { ...init, headers });
      }
    };
  }

  private async connect(tokenOverride?: string): Promise<void> {
    if (this.client) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const token = tokenOverride || envVars.NOTION_MCP_TOKEN;
      const url = new URL(envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp");
      
      logger.info("[Notion MCP] Connecting", { 
        url: url.toString(),
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 10) + '...'
      });

      try {
        this.client = new Client({ name: "orin-backend", version: "1.0.0" });
        this.transport = new StreamableHTTPClientTransport(url, {
          requestInit: this.buildRequestInit(tokenOverride)
        });
        await this.client.connect(this.transport);
        this.activeToken = token || null;
        logger.info("[Notion MCP] Connected via Streamable HTTP");
        return;
      } catch (error: any) {
        logger.warn("[Notion MCP] Streamable HTTP failed, attempting SSE", { error: error.message });
      }

      // Fallback to SSE
      try {
        const sseUrl = new URL(url.toString().replace(/\/mcp$/, "/sse"));
        this.client = new Client({ name: "orin-backend", version: "1.0.0" });
        this.transport = new SSEClientTransport(sseUrl, {
          eventSourceInit: this.buildEventSourceInit(tokenOverride),
          requestInit: this.buildRequestInit(tokenOverride)
        });
        await this.client.connect(this.transport);
        this.activeToken = token || null;
        logger.info("[Notion MCP] Connected via SSE");
      } catch (error: any) {
        logger.error("[Notion MCP] Connection failed", { 
          error: error.message,
          hasToken: !!token,
          tokenLength: token?.length || 0
        });
        throw error;
      }
    })();

    return this.connecting;
  }

  async callTool<T = any>(name: string, args: Record<string, any>, tokenOverride?: string): Promise<T> {
    const token = tokenOverride || envVars.NOTION_MCP_TOKEN;
    
    logger.info("[Notion MCP] callTool requested", {
      toolName: name,
      hasTokenOverride: !!tokenOverride,
      hasEnvToken: !!envVars.NOTION_MCP_TOKEN,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 20) + '...'
    });
    
    if (tokenOverride && this.activeToken && tokenOverride !== this.activeToken) {
      logger.info("[Notion MCP] Token changed, resetting connection");
      this.client = null;
      this.transport = null;
      this.connecting = null;
    }
    
    try {
      const result = await withRetry(
        async () => {
          await this.connect(tokenOverride);
          
          if (!this.client) {
            throw new NotionConnectionError("Notion MCP client is not connected");
          }
          
          return await this.client.callTool({ name, arguments: args });
        },
        {
          maxAttempts: 2,
          timeoutMs: 6000,
          backoffMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`[Notion MCP] Retry attempt ${attempt}`, {
              toolName: name,
              error: error.message
            });
          }
        }
      );
      
      return result as T;
    } catch (error: any) {
      logNotionError('Notion MCP callTool', error, token);
      
      // Transform error into appropriate type
      if (isNotionPermissionError(error)) {
        throw new NotionPermissionError(
          'Notion integration has no access to any pages. Please share a database or page with the integration in Notion.'
        );
      }
      
      if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        throw new NotionConnectionError('Notion request timed out. Please try again.');
      }
      
      throw error;
    }
  }
}

export const notionMcpClient = new NotionMcpClient();
export default notionMcpClient;
