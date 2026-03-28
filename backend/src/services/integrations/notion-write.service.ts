import envVars from '@/config/envVars.js';
import notionService from '@/services/integrations/notion.service.js';
import logger from '@/config/logger.js';
import db from '@/config/database.js';

export interface InboxEntryInput {
  title: string;
  type: 'idea' | 'task' | 'note' | 'research' | 'code' | 'document';
  tags: string[];
  content: string;
  summary?: string;
  source?: string;
  userId: string;
}

export interface InboxEntryResult {
  pageId: string;
  url: string;
  created: boolean;
  duplicate?: boolean;
  mergedWith?: string;
}

export interface RichContentBlock {
  type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item' | 'code';
  content: string;
  language?: string; // For code blocks
}

class NotionWriteService {
  private readonly MAX_CONTENT_LENGTH = 10000;
  private readonly MAX_TITLE_LENGTH = 2000;
  private readonly MAX_NOTION_BLOCKS_PER_APPEND = 100;
  private readonly MAX_NOTION_TEXT_LENGTH = 2000;
  private readonly ORIN_PAGE_TITLE = 'ORIN';
  private readonly DUPLICATE_CHECK_DAYS = 7;
  private readonly SIMILARITY_THRESHOLD = 0.8;

  /**
   * Append an entry to the persistent ORIN page
   */
  async createInboxEntry(input: InboxEntryInput): Promise<InboxEntryResult> {
    const startTime = Date.now();

    try {
      logger.info('[Notion Write] Appending content to ORIN page', {
        title: input.title,
        type: input.type,
        userId: input.userId
      });

      // Step 1: Validate input
      this.validateInput(input);

      const token = await this.getUserNotionRestToken(input.userId);
      if (!token && !envVars.NOTION_API_KEY) {
        throw new Error("No Notion REST token available. Connect Notion REST first.");
      }

      // Step 2: Resolve ORIN page
      const orinPage = await this.getOrCreateORINPage(token || undefined);
      const contentBlocks = this.transformContentToBlocks(input);

      // Step 3: Append blocks in Notion-safe batches
      let appendedBlockCount = 0;
      for (let index = 0; index < contentBlocks.length; index += this.MAX_NOTION_BLOCKS_PER_APPEND) {
        const batch = contentBlocks.slice(index, index + this.MAX_NOTION_BLOCKS_PER_APPEND);
        await notionService.appendBlocks(orinPage.id, batch, token || undefined);
        appendedBlockCount += batch.length;
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info('[Notion Write] Content appended to ORIN page successfully', {
        pageId: orinPage.id,
        url: orinPage.url,
        appendedBlockCount,
        processingTimeMs
      });

      return {
        pageId: orinPage.id,
        url: orinPage.url,
        created: true,
        duplicate: false
      };

    } catch (error: any) {
      logger.error('[Notion Write] Failed to create inbox entry', {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Get emoji icon for content type
   */
  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      idea: '💡',
      task: '✅',
      note: '📝',
      research: '🔬',
      code: '💻',
      document: '📄'
    };
    return icons[type] || '📌';
  }

  /**
   * Resolve the single ORIN page, creating it once if needed
   */
  private async getOrCreateORINPage(token?: string): Promise<{ id: string; url: string }> {
    const existingPage = await notionService.findPageByExactTitle(this.ORIN_PAGE_TITLE, token);

    if (existingPage) {
      logger.info('[Notion Write] Reusing existing ORIN page', {
        pageId: existingPage.id,
        title: existingPage.title
      });

      return {
        id: existingPage.id,
        url: existingPage.url || `https://notion.so/${existingPage.id.replace(/-/g, '')}`
      };
    }

    logger.info('[Notion Write] ORIN page not found, creating at workspace root');
    try {
      const page = await notionService.createPage({
        parent: { type: 'workspace', workspace: true },
        properties: {
          title: {
            title: [{
              text: {
                content: this.ORIN_PAGE_TITLE
              }
            }]
          }
        },
        icon: {
          type: 'emoji',
          emoji: '🧠'
        } as any,
        token
      });

      return {
        id: page.id,
        url: (page as any).url || `https://notion.so/${page.id.replace(/-/g, '')}`
      };
    } catch (error: any) {
      const isWorkspaceCreationBlocked =
        error?.code === 'validation_error' &&
        typeof error?.message === 'string' &&
        error.message.includes('workspace-level private pages is not supported');

      if (!isWorkspaceCreationBlocked) {
        throw error;
      }

      logger.warn('[Notion Write] Workspace root creation blocked by Notion integration type, falling back to first accessible parent', {
        error: error.message
      });

      const existingPages = await notionService.searchPages('', token);
      if (existingPages.length === 0) {
        throw new Error(
          'Unable to create the ORIN page because this Notion integration cannot create workspace-root pages and no shared parent page is accessible.'
        );
      }

      const fallbackParent = existingPages[0];
      const page = await notionService.createPage({
        parent: { page_id: fallbackParent.id },
        properties: {
          title: {
            title: [{
              text: {
                content: this.ORIN_PAGE_TITLE
              }
            }]
          }
        },
        icon: {
          type: 'emoji',
          emoji: '🧠'
        } as any,
        token
      });

      logger.info('[Notion Write] Created ORIN page under fallback parent', {
        pageId: page.id,
        parentPageId: fallbackParent.id,
        parentPageTitle: fallbackParent.title
      });

      return {
        id: page.id,
        url: (page as any).url || `https://notion.so/${page.id.replace(/-/g, '')}`
      };
    }
  }

  /**
   * Transform content to ORIN append blocks with metadata
   */
  private transformContentToBlocks(input: InboxEntryInput): Array<Record<string, any>> {
    const blocks: Array<Record<string, any>> = [];
    const tags = input.tags.length > 0 ? input.tags : [];

    blocks.push(this.createTextBlock('heading_2', input.title));
    blocks.push(this.createTextBlock('paragraph', `Type: ${input.type}`));
    blocks.push(this.createTextBlock('paragraph', `Stored: ${new Date().toLocaleString()}`));

    if (input.source) {
      blocks.push(this.createTextBlock('paragraph', `Source: ${input.source}`));
    }

    if (tags.length > 0) {
      blocks.push(this.createTextBlock('paragraph', 'Tags:'));
      blocks.push(
        ...tags.map((tag) => this.createTextBlock('bulleted_list_item', tag))
      );
    }

    if (input.summary) {
      blocks.push(this.createTextBlock('paragraph', 'Summary:'));
      blocks.push(...this.createParagraphBlocks(input.summary));
    }

    blocks.push(this.createTextBlock('paragraph', 'Content:'));
    blocks.push(...this.parseContentToBlocks(input.content));
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });

    return blocks;
  }

  /**
   * Parse content string into Notion blocks
   */
  private parseContentToBlocks(content: string): Array<Record<string, any>> {
    const blocks: Array<Record<string, any>> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (line.trim().length === 0) {
        continue;
      }

      // Detect heading 1 (# Heading)
      if (line.match(/^#\s+(.+)$/)) {
        blocks.push(this.createTextBlock('heading_1', line.replace(/^#\s+/, '').trim()));
        continue;
      }

      // Detect heading 2 (## Heading)
      if (line.match(/^##\s+(.+)$/)) {
        blocks.push(this.createTextBlock('heading_2', line.replace(/^##\s+/, '').trim()));
        continue;
      }

      // Detect heading 3 (### Heading)
      if (line.match(/^###\s+(.+)$/)) {
        blocks.push(this.createTextBlock('heading_3', line.replace(/^###\s+/, '').trim()));
        continue;
      }

      // Detect bulleted list (- item or * item)
      if (line.match(/^[\-\*]\s+(.+)$/)) {
        blocks.push(this.createTextBlock('bulleted_list_item', line.replace(/^[\-\*]\s+/, '').trim()));
        continue;
      }

      // Detect numbered list (1. item)
      if (line.match(/^\d+\.\s+(.+)$/)) {
        blocks.push(this.createTextBlock('numbered_list_item', line.replace(/^\d+\.\s+/, '').trim()));
        continue;
      }

      // Default: paragraph
      blocks.push(...this.createParagraphBlocks(line.trim()));
    }

    // If no blocks were created, add content as single paragraph
    if (blocks.length === 0) {
      blocks.push(...this.createParagraphBlocks(content));
    }

    return blocks;
  }

  private createParagraphBlocks(content: string): Array<Record<string, any>> {
    return this.chunkText(content).map((chunk) => this.createTextBlock('paragraph', chunk));
  }

  private createTextBlock(
    type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item',
    content: string
  ): Record<string, any> {
    const normalizedContent = content.trim().substring(0, this.MAX_NOTION_TEXT_LENGTH) || ' ';

    return {
      object: 'block',
      type,
      [type]: {
        rich_text: [{
          type: 'text',
          text: {
            content: normalizedContent
          }
        }]
      }
    };
  }

  private chunkText(content: string): string[] {
    const normalized = content.trim();
    if (!normalized) {
      return [' '];
    }

    const chunks: string[] = [];
    let remaining = normalized;

    while (remaining.length > this.MAX_NOTION_TEXT_LENGTH) {
      let splitIndex = remaining.lastIndexOf(' ', this.MAX_NOTION_TEXT_LENGTH);
      if (splitIndex <= 0) {
        splitIndex = this.MAX_NOTION_TEXT_LENGTH;
      }

      chunks.push(remaining.slice(0, splitIndex).trim());
      remaining = remaining.slice(splitIndex).trim();
    }

    if (remaining.length > 0) {
      chunks.push(remaining);
    }

    return chunks;
  }

  private renderMarkdownContent(input: InboxEntryInput): string {
    const meta = `Type: ${input.type}\nTags: ${input.tags.join(', ') || 'none'}\nCreated: ${new Date().toLocaleString()}`;
    return `# ${input.title}\n\n${meta}\n\n---\n\n${input.content}`;
  }

  private async getUserNotionRestToken(userId: string): Promise<string | undefined> {
    const user = await db.user.findUnique({ where: { id: userId } });
    return user?.notionRestAccessToken || envVars.NOTION_API_KEY;
  }

  /**
   * Validate input data
   */
  private validateInput(input: InboxEntryInput): void {
    // Validate title
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Title is required and cannot be empty');
    }

    if (input.title.length > this.MAX_TITLE_LENGTH) {
      throw new Error(`Title exceeds maximum length of ${this.MAX_TITLE_LENGTH} characters`);
    }

    // Validate type
    const validTypes = ['idea', 'task', 'note', 'research', 'code', 'document'];
    if (!validTypes.includes(input.type)) {
      throw new Error(`Invalid type: ${input.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate content
    if (!input.content || input.content.trim().length === 0) {
      // Allow empty content - use fallback
      input.content = 'No content available';
      logger.warn('[Notion Write] Empty content provided, using fallback', {
        fallback: input.content
      });
    }

    if (input.content.length > this.MAX_CONTENT_LENGTH) {
      logger.warn('[Notion Write] Content exceeds maximum length, truncating', {
        originalLength: input.content.length,
        maxLength: this.MAX_CONTENT_LENGTH
      });
      input.content = input.content.substring(0, this.MAX_CONTENT_LENGTH) + '... [truncated]';
    }

    // Validate tags
    if (!Array.isArray(input.tags)) {
      throw new Error('Tags must be an array');
    }

    // Sanitize tags
    input.tags = input.tags
      .filter(tag => tag && tag.trim().length > 0)
      .map(tag => tag.trim().substring(0, 100)) // Notion tag limit
      .slice(0, 10); // Max 10 tags

    logger.debug('[Notion Write] Input validation passed', {
      titleLength: input.title.length,
      contentLength: input.content.length,
      tagsCount: input.tags.length
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const notionWriteService = new NotionWriteService();
export default notionWriteService;
