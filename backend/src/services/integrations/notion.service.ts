import { Client, isFullPage } from "@notionhq/client";
import envVars from "@/config/envVars.js";
import logger from "@/config/logger.js";

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
}

export const notionService = new NotionService();
export default notionService;
