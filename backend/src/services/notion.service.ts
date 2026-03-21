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

  async createPage(params: {
    parent: { database_id: string } | { page_id: string };
    properties: Record<string, any>;
    children?: Array<Record<string, any>>;
  }) {
    try {
      const page = await this.client.pages.create({
        parent: params.parent,
        properties: params.properties,
        children: params.children,
      });

      logger.info(`[Notion] Created page: ${page.id}`);
      return page;
    } catch (error) {
      logger.error("[Notion] Failed to create page", error);
      throw error;
    }
  }

  async queryDatabase(databaseId: string, filter?: Record<string, any>) {
    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
        filter,
      });

      return response.results.map((page) => {
        if (isFullPage(page)) {
          return {
            id: page.id,
            properties: page.properties,
            url: page.url,
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      logger.error("[Notion] Failed to query database", error);
      throw error;
    }
  }

  async getPageContent(pageId: string) {
    try {
      const blocks = await this.client.blocks.children.list({
        block_id: pageId,
      });

      return blocks.results;
    } catch (error) {
      logger.error("[Notion] Failed to get page content", error);
      throw error;
    }
  }

  async appendBlocks(pageId: string, children: Array<Record<string, any>>) {
    try {
      const response = await this.client.blocks.children.append({
        block_id: pageId,
        children,
      });

      logger.info(`[Notion] Appended blocks to page: ${pageId}`);
      return response;
    } catch (error) {
      logger.error("[Notion] Failed to append blocks", error);
      throw error;
    }
  }
}

export const notionService = new NotionService();
export default notionService;
