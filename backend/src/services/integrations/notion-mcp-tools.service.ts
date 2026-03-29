import logger from "@/config/logger.js";
import { notionMcpClientService } from "./notion-mcp-client.service.js";

/**
 * Service to orchestrate complex Notion MCP tool sequences
 * Implements all 14 official Notion MCP Tools
 */
class NotionMcpToolsService {
  
  // 1. notion-search: Search for pages or databases
  async search(userId: string, query: string, filter?: any) {
    return notionMcpClientService.executeTool(userId, "notion-search", { query, filter });
  }

  // 2. notion-fetch: Fetch full content of a page/database
  async fetch(userId: string, pageId: string) {
    return notionMcpClientService.executeTool(userId, "notion-fetch", { page_id: pageId });
  }

  // 3. notion-create-pages: Create one or more pages
  async createPages(userId: string, pages: any[]) {
    return notionMcpClientService.executeTool(userId, "notion-create-pages", { pages });
  }

  // 4. notion-update-page: Update page properties or content
  async updatePage(userId: string, pageId: string, properties?: any, content?: string) {
    return notionMcpClientService.executeTool(userId, "notion-update-page", { page_id: pageId, properties, content });
  }

  // 5. notion-move-pages: Move pages to a new parent
  async movePages(userId: string, pageIds: string[], parentId: string) {
    return notionMcpClientService.executeTool(userId, "notion-move-pages", { page_ids: pageIds, parent_id: parentId });
  }

  // 6. notion-duplicate-page: Duplicate an existing page
  async duplicatePage(userId: string, pageId: string) {
    return notionMcpClientService.executeTool(userId, "notion-duplicate-page", { page_id: pageId });
  }

  // 7. notion-create-database: Create a new database
  async createDatabase(userId: string, parentPageId: string, title: any[], properties: any) {
    return notionMcpClientService.executeTool(userId, "notion-create-database", { 
      parent: { type: "page_id", page_id: parentPageId },
      title,
      properties
    });
  }

  // 8. notion-update-data-source: Update database properties
  async updateDataSource(userId: string, databaseId: string, properties: any) {
    return notionMcpClientService.executeTool(userId, "notion-update-data-source", { database_id: databaseId, properties });
  }

  // 9. notion-create-comment: Add comment to a block or page
  async createComment(userId: string, discussionId: string, text: string) {
    return notionMcpClientService.executeTool(userId, "notion-create-comment", {
      discussion_id: discussionId,
      rich_text: [{ text: { content: text } }]
    });
  }

  // 10. notion-get-comments: Retrieve comments for a block
  async getComments(userId: string, blockId: string) {
    return notionMcpClientService.executeTool(userId, "notion-get-comments", { block_id: blockId });
  }

  // 11. notion-get-teams: List teams in the workspace
  async getTeams(userId: string) {
    return notionMcpClientService.executeTool(userId, "notion-get-teams", {});
  }

  // 12. notion-get-users: List users in the workspace
  async getUsers(userId: string) {
    return notionMcpClientService.executeTool(userId, "notion-get-users", {});
  }

  // 13. notion-create-view: Create a database view
  async createView(userId: string, databaseId: string, name: string, type: string, format?: any) {
    return notionMcpClientService.executeTool(userId, "notion-create-view", { database_id: databaseId, name, type, format });
  }

  // 14. notion-update-view: Update an existing view
  async updateView(userId: string, viewId: string, name?: string, format?: any) {
    return notionMcpClientService.executeTool(userId, "notion-update-view", { view_id: viewId, name, format });
  }

  /**
   * HIGH-LEVEL HELPER: Search for a page by name and return its ID
   */
  async findPageId(userId: string, query: string): Promise<string | null> {
    try {
      const response = await this.search(userId, query, { property: "object", value: "page" });
      if (response?.content && Array.isArray(response.content)) {
        const text = response.content.map((c: any) => c.text || "").join("");
        const match = text.match(/id:\s*([a-f0-9-]{36})/i) || text.match(/([a-f0-9]{32})/i);
        return match ? (match[1] || match[0]) : null;
      }
      return null;
    } catch (error) {
      logger.error("[Notion MCP Tools] findPageId failed", { query, error });
      return null;
    }
  }

  /**
   * Alias for updatePage (backwards compatibility)
   */
  async appendToPage(userId: string, pageId: string, content: string) {
    return this.updatePage(userId, pageId, undefined, content);
  }

  /**
   * Alias for createComment (backwards compatibility)
   */
  async addComment(userId: string, discussionId: string, text: string) {
    return this.createComment(userId, discussionId, text);
  }
}

export const notionMcpToolsService = new NotionMcpToolsService();
export default notionMcpToolsService;
