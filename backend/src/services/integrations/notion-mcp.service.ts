import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import notionMcpClient from "./notion-mcp.client.js";

export interface McpCreatePageResult {
  pageId: string;
  url?: string;
}

class NotionMcpService {
  async createPage(params: {
    title: string;
    content: string;
    icon?: string;
    token?: string;
  }): Promise<McpCreatePageResult> {
    const parent = this.getParent();
    const payload: any = {
      pages: [
        {
          properties: {
            title: params.title
          },
          content: params.content
        }
      ]
    };

    if (parent) payload.parent = parent;
    if (params.icon) payload.pages[0].icon = params.icon;

    logger.info("[Notion MCP] create page", { parent });
    const result: any = await notionMcpClient.callTool("notion-create-pages", payload, params.token);
    const created = Array.isArray(result?.pages) ? result.pages[0] : result?.page ?? result;

    return {
      pageId: created?.id || created?.page_id || "unknown",
      url: created?.url
    };
  }

  async search(query: string, token?: string): Promise<any[]> {
    logger.info("[Notion MCP] search", { query });
    const result: any = await notionMcpClient.callTool("notion-search", { query }, token);
    return result?.results || result?.data || result || [];
  }

  async fetch(idOrUrl: string, token?: string): Promise<any> {
    logger.info("[Notion MCP] fetch", { idOrUrl });
    return notionMcpClient.callTool("notion-fetch", { id: idOrUrl }, token);
  }

  private getParent(): { database_id?: string; page_id?: string } | null {
    if (envVars.NOTION_DATABASE_ID) {
      return { database_id: envVars.NOTION_DATABASE_ID };
    }
    if (envVars.NOTION_MCP_PARENT_PAGE_ID) {
      return { page_id: envVars.NOTION_MCP_PARENT_PAGE_ID };
    }
    return null;
  }
}

export const notionMcpService = new NotionMcpService();
export default notionMcpService;
