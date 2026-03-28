import envVars from '@/config/envVars.js';
import notionService from '@/services/integrations/notion.service.js';
import logger from '@/config/logger.js';
import db from '@/config/database.js';

export interface InboxEntryInput {
  title: string;
  type: 'idea' | 'task' | 'note' | 'research' | 'code' | 'document';
  tags: string[];
  content: string;
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
  private readonly DUPLICATE_CHECK_DAYS = 7;
  private readonly SIMILARITY_THRESHOLD = 0.8;

  /**
   * Create an entry in Notion as a standalone page
   */
  async createInboxEntry(input: InboxEntryInput): Promise<InboxEntryResult> {
    const startTime = Date.now();

    try {
      logger.info('[Notion Write] Creating inbox entry as standalone page', {
        title: input.title,
        type: input.type,
        userId: input.userId
      });

      // Step 1: Validate input
      this.validateInput(input);

      let pageId = '';
      let pageUrl = '';

      const token = await this.getUserNotionRestToken(input.userId);
      if (!token && !envVars.NOTION_API_KEY) {
        throw new Error("No Notion REST token available. Connect Notion REST first.");
      }

      // Step 2: Transform content into Notion blocks
      const contentBlocks = this.transformContentToBlocks(input.content, input);

      // Step 3: Resolve parent for page creation
      // For MCP tokens, we need to find an existing page to use as parent
      // since workspace-level private pages are not supported
      let parentConfig: any = { type: 'workspace', workspace: true };
      
      try {
        const existingPages = await notionService.searchPages("", token);
        if (existingPages.length > 0) {
          parentConfig = { page_id: existingPages[0].id };
          logger.info('[Notion Write] Using existing page as parent', {
            parentPageId: existingPages[0].id,
            parentPageTitle: existingPages[0].title
          });
        }
      } catch (searchError) {
        // Fall back to workspace if search fails
        logger.warn('[Notion Write] Could not search for parent pages, using workspace', { searchError });
      }

      // Create page with resolved parent
      const page = await notionService.createPage({
        parent: parentConfig,
        properties: {
          title: {
            title: [{
              text: {
                content: input.title
              }
            }]
          }
        },
        icon: {
          type: 'emoji',
          emoji: this.getIconForType(input.type)
        } as any,
        children: contentBlocks,
        token: token || undefined
      });

      pageId = page.id;
      pageUrl = (page as any).url || `https://notion.so/${page.id.replace(/-/g, '')}`;

      const processingTimeMs = Date.now() - startTime;

      logger.info('[Notion Write] Inbox entry created successfully', {
        pageId,
        url: pageUrl,
        processingTimeMs
      });

      return {
        pageId,
        url: pageUrl || `https://notion.so/${pageId.replace(/-/g, '')}`,
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
   * Transform content to Notion blocks with metadata
   */
  private transformContentToBlocks(content: string, input: InboxEntryInput): Array<Record<string, any>> {
    const blocks: Array<Record<string, any>> = [];

    // Add metadata callout at the top
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{
          type: 'text',
          text: {
            content: `Type: ${input.type} | Tags: ${input.tags.join(', ') || 'none'} | Created: ${new Date().toLocaleString()}`
          }
        }],
        icon: {
          type: 'emoji',
          emoji: this.getIconForType(input.type)
        },
        color: 'gray_background'
      }
    });

    // Add divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });

    // Parse and add content blocks
    const contentBlocks = this.parseContentToBlocks(content);
    blocks.push(...contentBlocks);

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
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{
              type: 'text',
              text: { content: line.replace(/^#\s+/, '').trim().substring(0, 2000) }
            }]
          }
        });
        continue;
      }

      // Detect heading 2 (## Heading)
      if (line.match(/^##\s+(.+)$/)) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{
              type: 'text',
              text: { content: line.replace(/^##\s+/, '').trim().substring(0, 2000) }
            }]
          }
        });
        continue;
      }

      // Detect heading 3 (### Heading)
      if (line.match(/^###\s+(.+)$/)) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{
              type: 'text',
              text: { content: line.replace(/^###\s+/, '').trim().substring(0, 2000) }
            }]
          }
        });
        continue;
      }

      // Detect bulleted list (- item or * item)
      if (line.match(/^[\-\*]\s+(.+)$/)) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: line.replace(/^[\-\*]\s+/, '').trim().substring(0, 2000) }
            }]
          }
        });
        continue;
      }

      // Detect numbered list (1. item)
      if (line.match(/^\d+\.\s+(.+)$/)) {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: line.replace(/^\d+\.\s+/, '').trim().substring(0, 2000) }
            }]
          }
        });
        continue;
      }

      // Default: paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: {
              content: line.trim().substring(0, 2000)
            }
          }]
        }
      });
    }

    // If no blocks were created, add content as single paragraph
    if (blocks.length === 0) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: {
              content: content.substring(0, 2000)
            }
          }]
        }
      });
    }

    return blocks;
  }

  private renderMarkdownContent(input: InboxEntryInput): string {
    const meta = `Type: ${input.type}\nTags: ${input.tags.join(', ') || 'none'}\nCreated: ${new Date().toLocaleString()}`;
    return `# ${input.title}\n\n${meta}\n\n---\n\n${input.content}`;
  }

  private async getUserNotionRestToken(userId: string): Promise<string | undefined> {
    const user = await db.user.findUnique({ where: { id: userId } });
    return user?.notionRestAccessToken || user?.notionToken || envVars.NOTION_API_KEY;
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
