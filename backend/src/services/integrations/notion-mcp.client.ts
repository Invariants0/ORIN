import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";

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
      const url = new URL(envVars.NOTION_MCP_URL || "https://mcp.notion.com/mcp");
      logger.info("[Notion MCP] Connecting", { url: url.toString() });

      try {
        this.client = new Client({ name: "orin-backend", version: "1.0.0" });
        this.transport = new StreamableHTTPClientTransport(url, {
          requestInit: this.buildRequestInit(tokenOverride)
        });
        await this.client.connect(this.transport);
        this.activeToken = tokenOverride || envVars.NOTION_MCP_TOKEN || null;
        logger.info("[Notion MCP] Connected via Streamable HTTP");
        return;
      } catch (error: any) {
        logger.warn("[Notion MCP] Streamable HTTP failed, attempting SSE", { error: error.message });
      }

      // Fallback to SSE
      const sseUrl = new URL(url.toString().replace(/\/mcp$/, "/sse"));
      this.client = new Client({ name: "orin-backend", version: "1.0.0" });
      this.transport = new SSEClientTransport(sseUrl, {
        eventSourceInit: this.buildEventSourceInit(tokenOverride),
        requestInit: this.buildRequestInit(tokenOverride)
      });
      await this.client.connect(this.transport);
      this.activeToken = tokenOverride || envVars.NOTION_MCP_TOKEN || null;
      logger.info("[Notion MCP] Connected via SSE");
    })();

    return this.connecting;
  }

  async callTool<T = any>(name: string, args: Record<string, any>, tokenOverride?: string): Promise<T> {
    if (tokenOverride && this.activeToken && tokenOverride !== this.activeToken) {
      this.client = null;
      this.transport = null;
      this.connecting = null;
    }
    await this.connect(tokenOverride);
    if (!this.client) {
      throw new Error("Notion MCP client is not connected");
    }
    const result = await this.client.callTool({ name, arguments: args });
    return result as T;
  }
}

export const notionMcpClient = new NotionMcpClient();
export default notionMcpClient;
