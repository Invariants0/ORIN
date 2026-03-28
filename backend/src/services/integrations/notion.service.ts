import { Client, isFullPage } from "@notionhq/client";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";
import notionMcpOauthService from "@/services/integrations/notion-mcp-oauth.service.js";
import db from "@/config/database.js";

export class NotionService {
  private client: Client;

  constructor() {
    this.client = new Client({
      auth: envVars.NOTION_API_KEY,
    });
  }

  private getClient(token?: string): Client {
    if (token) {
      return new Client({ auth: token });
    }
    if (!envVars.NOTION_API_KEY) {
      throw new Error("NOTION_API_KEY is not configured");
    }
    return this.client;
  }

  /**
   * Get a valid access token, refreshing if necessary
   * For MCP tokens, automatically attempts refresh if token is expired
   * Falls back to original token if refresh fails
   */
  async getValidAccessToken(userId: string, token: string): Promise<string> {
    if (!token) {
      throw new Error("No access token provided");
    }

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          notionMcpExpiresAt: true,
          notionMcpAccessToken: true,
          notionMcpRefreshToken: true
        }
      });

      // Only attempt refresh if token is actually expired
      if (
        user?.notionMcpExpiresAt &&
        user.notionMcpExpiresAt.getTime() < Date.now() &&
        user.notionMcpRefreshToken
      ) {
        logger.info("[Notion] MCP token expired, attempting refresh", { userId });
        const refreshedTokens = await notionMcpOauthService.refreshAccessToken(userId);
        
        if (refreshedTokens?.access_token) {
          logger.info("[Notion] MCP token refreshed successfully", { userId });
          return refreshedTokens.access_token;
        } else {
          logger.warn("[Notion] Token refresh failed, falling back to original token", { userId });
          // Fall through and use original token
        }
      }
    } catch (error) {
      logger.warn("[Notion] Error checking token expiry", { userId, error });
      // Fall through and use original token
    }

    return token;
  }

  async createPage(params: {
    parent: { database_id: string } | { page_id: string } | { workspace: boolean };
    properties: Record<string, any>;
    children?: Array<Record<string, any>>;
    icon?: Record<string, any>;
    token?: string;
  }) {
    try {
      const client = this.getClient(params.token);
      const page = await client.pages.create({
        parent: params.parent as any,
        properties: params.properties as any,
        children: params.children as any,
        icon: params.icon as any,
      });

      logger.info(`[Notion] Created page: ${page.id}`);
      return page;
    } catch (error) {
      logger.error("[Notion] Failed to create page", error);
      throw error;
    }
  }

  async queryDatabase(databaseId: string, filter?: Record<string, any>, token?: string) {
    try {
      const client = this.getClient(token);
      const response = await (client.databases as any).query({
        database_id: databaseId,
        filter,
      });

      return response.results
        .map((page: any) => {
          if (isFullPage(page)) {
            return {
              id: page.id,
              properties: page.properties,
              url: page.url,
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch (error) {
      logger.error("[Notion] Failed to query database", error);
      throw error;
    }
  }

  async getPageContent(pageId: string, token?: string) {
    try {
      const client = this.getClient(token);
      const blocks = await client.blocks.children.list({
        block_id: pageId,
      });

      return blocks.results;
    } catch (error) {
      logger.error("[Notion] Failed to get page content", error);
      throw error;
    }
  }

  async appendBlocks(pageId: string, children: Array<Record<string, any>>, token?: string) {
    try {
      const client = this.getClient(token);
      const response = await client.blocks.children.append({
        block_id: pageId,
        children: children as any,
      });

      logger.info(`[Notion] Appended blocks to page: ${pageId}`);
      return response;
    } catch (error) {
      logger.error("[Notion] Failed to append blocks", error);
      throw error;
    }
  }

  async getCurrentUser(token?: string) {
    const client = this.getClient(token);
    return client.users.me({});
  }

  /**
   * Search for pages in the user's Notion workspace
   * Used to find a parent page for creating new pages (required for MCP tokens)
   */
  async searchPages(query: string = "", token?: string) {
    try {
      const client = this.getClient(token);
      const response = await (client.search as any)({
        query: query || "",
        sort: {
          direction: "ascending",
          timestamp: "last_edited_time",
        },
        filter: {
          value: "page",
          property: "object",
        },
      });

      return response.results
        .filter((item: any) => isFullPage(item))
        .map((page: any) => ({
          id: page.id,
          title: (page as any).title || "Untitled",
          url: page.url,
          lastEditedTime: page.last_edited_time,
        }));
    } catch (error) {
      logger.error("[Notion] Failed to search pages", error);
      return [];
    }
  }

  /**
   * Create a page with automatic parent resolution
   * For MCP tokens: searches for a parent page to use
   * For regular tokens: uses the provided parent or workspace
   */
  async createPageWithAutomaticParent(
    title: string,
    content?: string,
    token?: string,
    userId?: string
  ) {
    try {
      // Get valid access token (refresh if needed)
      let validToken = token;
      if (userId && token) {
        validToken = await this.getValidAccessToken(userId, token);
      }

      let parentConfig: any = { workspace: true };

      // Try to find an existing page to use as parent
      // This is required for MCP tokens (internal integrations)
      const existingPages = await this.searchPages("", validToken);
      
      if (existingPages.length > 0) {
        // Use the first page as parent
        parentConfig = { page_id: existingPages[0].id };
        logger.info("[Notion] Using existing page as parent for new page", {
          parentPageId: existingPages[0].id,
          parentPageTitle: existingPages[0].title,
          userId
        });
      }

      const properties: Record<string, any> = {
        title: {
          title: [{ text: { content: title } }],
        },
      };

      return await this.createPage({
        parent: parentConfig,
        properties,
        children: content
          ? [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [
                    {
                      type: "text",
                      text: { content: content },
                    },
                  ],
                },
              },
            ]
          : undefined,
        token: validToken,
      });
    } catch (error) {
      logger.error("[Notion] Failed to create page with automatic parent", error);
      throw error;
    }
  }
}

export const notionService = new NotionService();
export default notionService;
