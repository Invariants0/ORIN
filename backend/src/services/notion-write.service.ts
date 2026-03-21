import notionService from './notion.service.js';
import logger from '../config/logger.js';
import envVars from '../config/envVars.js';

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
   * Create an entry in the Notion Inbox database
   */
  async createInboxEntry(input: InboxEntryInput): Promise<InboxEntryResult> {
    const startTime = Date.now();

    try {
      logger.info('[Notion Write] Creating inbox entry', {
        title: input.title,
        type: input.type,
        userId: input.userId
      });

      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Check for duplicates
      const duplicateCheck = await this.checkForDuplicates(input);
      if (duplicateCheck.isDuplicate) {
        logger.info('[Notion Write] Duplicate detected, skipping creation', {
          existingPageId: duplicateCheck.existingPageId
        });

        return {
          pageId: duplicateCheck.existingPageId!,
          url: duplicateCheck.existingUrl!,
          created: false,
          duplicate: true,
          mergedWith: duplicateCheck.existingPageId
        };
      }

      // Step 3: Transform content into Notion blocks
      const contentBlocks = this.transformContentToBlocks(input.content);

      // Step 4: Prepare Notion properties
      const properties = this.buildNotionProperties(input);

      // Step 5: Create page in Notion
      const databaseId = envVars.NOTION_DATABASE_ID || '';
      if (!databaseId) {
        throw new Error('Notion database ID not configured');
      }

      const page = await notionService.createPage({
        parent: { database_id: databaseId },
        properties,
        children: contentBlocks
      });

      const pageUrl = (page as any).url || `https://notion.so/${page.id.replace(/-/g, '')}`;

      const processingTimeMs = Date.now() - startTime;

      logger.info('[Notion Write] Inbox entry created successfully', {
        pageId: page.id,
        processingTimeMs
      });

      return {
        pageId: page.id,
        url: pageUrl,
        created: true,
        duplicate: false
      };

    } catch (error: any) {
      logger.error('[Notion Write] Failed to create inbox entry', {
        error: error.message,
        input
      });

      // Retry once on failure
      if (!error.retried) {
        logger.info('[Notion Write] Retrying inbox entry creation');
        error.retried = true;
        await this.sleep(1000);
        return this.createInboxEntry(input);
      }

      throw error;
    }
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
      throw new Error('Content is required and cannot be empty');
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
   * Check for duplicate entries
   */
  private async checkForDuplicates(input: InboxEntryInput): Promise<{
    isDuplicate: boolean;
    existingPageId?: string;
    existingUrl?: string;
  }> {
    try {
      const databaseId = envVars.NOTION_DATABASE_ID || '';
      if (!databaseId) {
        return { isDuplicate: false };
      }

      // Query recent entries (last 7 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.DUPLICATE_CHECK_DAYS);

      const recentEntries = await notionService.queryDatabase(databaseId, {
        and: [
          {
            property: 'Created At',
            date: {
              on_or_after: cutoffDate.toISOString()
            }
          },
          {
            property: 'Type',
            select: {
              equals: input.type
            }
          }
        ]
      });

      // Check for similar titles
      for (const entry of recentEntries) {
        const existingTitle = entry.properties.Title?.title?.[0]?.plain_text || '';
        const similarity = this.calculateSimilarity(input.title, existingTitle);

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          logger.info('[Notion Write] Found duplicate entry', {
            existingTitle,
            newTitle: input.title,
            similarity
          });

          return {
            isDuplicate: true,
            existingPageId: entry.id,
            existingUrl: entry.url || `https://notion.so/${entry.id.replace(/-/g, '')}`
          };
        }
      }

      logger.debug('[Notion Write] No duplicates found', {
        checkedEntries: recentEntries.length
      });

      return { isDuplicate: false };

    } catch (error: any) {
      logger.error('[Notion Write] Duplicate check failed', {
        error: error.message
      });
      // On error, proceed with creation (fail open)
      return { isDuplicate: false };
    }
  }

  /**
   * Calculate similarity between two strings (simple Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Simple word-based similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Build Notion properties object
   */
  private buildNotionProperties(input: InboxEntryInput): Record<string, any> {
    const properties: Record<string, any> = {
      Title: {
        title: [{
          text: {
            content: input.title
          }
        }]
      },
      Type: {
        select: {
          name: input.type
        }
      },
      Tags: {
        multi_select: input.tags.map(tag => ({ name: tag }))
      },
      'Created At': {
        date: {
          start: new Date().toISOString()
        }
      }
    };

    // Add source if provided
    if (input.source) {
      // Check if source is a URL
      const isUrl = /^https?:\/\//i.test(input.source);
      
      if (isUrl) {
        properties.Source = {
          url: input.source
        };
      } else {
        properties.Source = {
          rich_text: [{
            text: {
              content: input.source.substring(0, 2000) // Notion limit
            }
          }]
        };
      }
    }

    // Add user ID as a property (if database has this field)
    if (input.userId) {
      properties.UserId = {
        rich_text: [{
          text: {
            content: input.userId
          }
        }]
      };
    }

    return properties;
  }

  /**
   * Transform content string into Notion blocks
   */
  private transformContentToBlocks(content: string): Array<Record<string, any>> {
    const blocks: Array<Record<string, any>> = [];

    // Parse content into structured blocks
    const parsedBlocks = this.parseContentStructure(content);

    for (const block of parsedBlocks) {
      const notionBlock = this.createNotionBlock(block);
      if (notionBlock) {
        blocks.push(notionBlock);
      }
    }

    // If no blocks were created, add content as single paragraph
    if (blocks.length === 0) {
      blocks.push(this.createParagraphBlock(content));
    }

    return blocks;
  }

  /**
   * Parse content into structured blocks
   */
  private parseContentStructure(content: string): RichContentBlock[] {
    const blocks: RichContentBlock[] = [];
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
          type: 'heading_1',
          content: line.replace(/^#\s+/, '').trim()
        });
        continue;
      }

      // Detect heading 2 (## Heading)
      if (line.match(/^##\s+(.+)$/)) {
        blocks.push({
          type: 'heading_2',
          content: line.replace(/^##\s+/, '').trim()
        });
        continue;
      }

      // Detect heading 3 (### Heading)
      if (line.match(/^###\s+(.+)$/)) {
        blocks.push({
          type: 'heading_3',
          content: line.replace(/^###\s+/, '').trim()
        });
        continue;
      }

      // Detect bulleted list (- item or * item)
      if (line.match(/^[\-\*]\s+(.+)$/)) {
        blocks.push({
          type: 'bulleted_list_item',
          content: line.replace(/^[\-\*]\s+/, '').trim()
        });
        continue;
      }

      // Detect numbered list (1. item)
      if (line.match(/^\d+\.\s+(.+)$/)) {
        blocks.push({
          type: 'numbered_list_item',
          content: line.replace(/^\d+\.\s+/, '').trim()
        });
        continue;
      }

      // Detect code block (```language ... ```)
      if (line.match(/^```(\w+)?$/)) {
        const language = line.match(/^```(\w+)?$/)?.[1] || 'plain text';
        const codeLines: string[] = [];
        i++; // Move to next line

        while (i < lines.length && !lines[i].match(/^```$/)) {
          codeLines.push(lines[i]);
          i++;
        }

        blocks.push({
          type: 'code',
          content: codeLines.join('\n'),
          language
        });
        continue;
      }

      // Default: paragraph
      blocks.push({
        type: 'paragraph',
        content: line.trim()
      });
    }

    return blocks;
  }

  /**
   * Create Notion block from parsed block
   */
  private createNotionBlock(block: RichContentBlock): Record<string, any> | null {
    // Notion has a 2000 character limit per rich text block
    const truncatedContent = block.content.substring(0, 2000);

    switch (block.type) {
      case 'paragraph':
        return this.createParagraphBlock(truncatedContent);

      case 'heading_1':
        return {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }]
          }
        };

      case 'heading_2':
        return {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }]
          }
        };

      case 'heading_3':
        return {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }]
          }
        };

      case 'bulleted_list_item':
        return {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }]
          }
        };

      case 'numbered_list_item':
        return {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }]
          }
        };

      case 'code':
        return {
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{
              type: 'text',
              text: { content: truncatedContent }
            }],
            language: block.language || 'plain text'
          }
        };

      default:
        return null;
    }
  }

  /**
   * Create paragraph block
   */
  private createParagraphBlock(content: string): Record<string, any> {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: content.substring(0, 2000) // Notion limit
          }
        }]
      }
    };
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
