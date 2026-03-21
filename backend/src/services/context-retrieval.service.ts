import notionService from './notion.service.js';
import logger from '../config/logger.js';
import envVars from '../config/envVars.js';

export interface ContextRetrievalInput {
  query: string;
  searchTerms: string[];
  userId: string;
  limit?: number;
  dateRange?: number; // days to look back
}

export interface ContextResult {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  type: string;
  createdAt: string;
  url: string;
  relevanceScore: number;
}

export interface ContextRetrievalResult {
  results: ContextResult[];
  topMatches: ContextResult[];
  total: number;
  metadata: {
    query: string;
    searchTerms: string[];
    processingTimeMs: number;
    averageScore: number;
  };
}

class ContextRetrievalService {
  private readonly DEFAULT_LIMIT = 5;
  private readonly DEFAULT_DATE_RANGE = 30; // days
  private readonly MIN_RELEVANCE_SCORE = 0.1;

  // Scoring weights
  private readonly WEIGHTS = {
    TITLE_MATCH: 3.0,
    TAG_MATCH: 2.0,
    CONTENT_MATCH: 1.5,
    RECENCY: 1.0,
    TYPE_MATCH: 0.5
  };

  /**
   * Retrieve and rank relevant context from Notion
   */
  async retrieveContext(input: ContextRetrievalInput): Promise<ContextRetrievalResult> {
    const startTime = Date.now();

    try {
      logger.info('[Context Retrieval] Starting context retrieval', {
        query: input.query,
        searchTerms: input.searchTerms,
        userId: input.userId
      });

      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Query Notion database
      const rawResults = await this.queryNotionDatabase(input);

      logger.info('[Context Retrieval] Raw results fetched', {
        count: rawResults.length
      });

      // Step 3: Score and rank results
      const scoredResults = this.scoreResults(rawResults, input);

      // Step 4: Filter by minimum score
      const filteredResults = scoredResults.filter(
        result => result.relevanceScore >= this.MIN_RELEVANCE_SCORE
      );

      // Step 5: Sort by relevance score (descending)
      const sortedResults = filteredResults.sort(
        (a, b) => b.relevanceScore - a.relevanceScore
      );

      // Step 6: Select top K results
      const limit = input.limit || this.DEFAULT_LIMIT;
      const topMatches = sortedResults.slice(0, limit);

      const processingTimeMs = Date.now() - startTime;

      // Calculate average score
      const averageScore = sortedResults.length > 0
        ? sortedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / sortedResults.length
        : 0;

      logger.info('[Context Retrieval] Context retrieval completed', {
        totalResults: sortedResults.length,
        topMatches: topMatches.length,
        averageScore: averageScore.toFixed(2),
        processingTimeMs
      });

      return {
        results: sortedResults,
        topMatches,
        total: sortedResults.length,
        metadata: {
          query: input.query,
          searchTerms: input.searchTerms,
          processingTimeMs,
          averageScore
        }
      };

    } catch (error: any) {
      logger.error('[Context Retrieval] Failed to retrieve context', {
        error: error.message,
        query: input.query
      });
      throw error;
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: ContextRetrievalInput): void {
    if (!input.query || input.query.trim().length === 0) {
      throw new Error('Query is required and cannot be empty');
    }

    if (!Array.isArray(input.searchTerms)) {
      throw new Error('Search terms must be an array');
    }

    if (input.searchTerms.length === 0) {
      logger.warn('[Context Retrieval] No search terms provided, using query as search term');
      input.searchTerms = [input.query];
    }

    if (!input.userId || input.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Query Notion database with filters
   */
  private async queryNotionDatabase(input: ContextRetrievalInput): Promise<any[]> {
    try {
      const databaseId = envVars.NOTION_DATABASE_ID || '';
      if (!databaseId) {
        logger.warn('[Context Retrieval] No Notion database ID configured');
        return [];
      }

      // Calculate date range
      const dateRange = input.dateRange || this.DEFAULT_DATE_RANGE;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      // Query with date filter
      const filter: any = {
        property: 'Created At',
        date: {
          on_or_after: cutoffDate.toISOString()
        }
      };

      const results = await notionService.queryDatabase(databaseId, filter);

      logger.debug('[Context Retrieval] Notion query completed', {
        resultsCount: results.length,
        dateRange: `${dateRange} days`
      });

      return results;

    } catch (error: any) {
      logger.error('[Context Retrieval] Notion query failed', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Score and rank results based on relevance
   */
  private scoreResults(rawResults: any[], input: ContextRetrievalInput): ContextResult[] {
    const scoredResults: ContextResult[] = [];

    for (const result of rawResults) {
      try {
        // Extract data from Notion result
        const title = this.extractTitle(result);
        const tags = this.extractTags(result);
        const type = this.extractType(result);
        const content = this.extractContent(result);
        const createdAt = this.extractCreatedAt(result);
        const url = result.url || `https://notion.so/${result.id.replace(/-/g, '')}`;

        // Calculate relevance score
        const relevanceScore = this.calculateRelevanceScore({
          title,
          tags,
          type,
          content,
          createdAt
        }, input);

        // Create summary (first 200 chars of content)
        const summary = content.length > 200
          ? content.substring(0, 200) + '...'
          : content;

        scoredResults.push({
          id: result.id,
          title,
          summary,
          content,
          tags,
          type,
          createdAt,
          url,
          relevanceScore
        });

      } catch (error: any) {
        logger.warn('[Context Retrieval] Failed to process result', {
          resultId: result.id,
          error: error.message
        });
        // Skip this result and continue
      }
    }

    return scoredResults;
  }

  /**
   * Calculate relevance score for a result
   */
  private calculateRelevanceScore(
    result: {
      title: string;
      tags: string[];
      type: string;
      content: string;
      createdAt: string;
    },
    input: ContextRetrievalInput
  ): number {
    let score = 0;

    const queryLower = input.query.toLowerCase();
    const searchTermsLower = input.searchTerms.map(term => term.toLowerCase());

    // 1. Title Match Score (highest weight)
    const titleLower = result.title.toLowerCase();
    let titleMatchCount = 0;

    for (const term of searchTermsLower) {
      if (titleLower.includes(term)) {
        titleMatchCount++;
      }
    }

    if (titleMatchCount > 0) {
      score += (titleMatchCount / searchTermsLower.length) * this.WEIGHTS.TITLE_MATCH;
    }

    // 2. Tag Match Score
    const tagsLower = result.tags.map(tag => tag.toLowerCase());
    let tagMatchCount = 0;

    for (const term of searchTermsLower) {
      for (const tag of tagsLower) {
        if (tag.includes(term) || term.includes(tag)) {
          tagMatchCount++;
        }
      }
    }

    if (tagMatchCount > 0) {
      score += (tagMatchCount / Math.max(searchTermsLower.length, tagsLower.length)) * this.WEIGHTS.TAG_MATCH;
    }

    // 3. Content Match Score
    const contentLower = result.content.toLowerCase();
    let contentMatchCount = 0;

    for (const term of searchTermsLower) {
      if (contentLower.includes(term)) {
        contentMatchCount++;
      }
    }

    if (contentMatchCount > 0) {
      score += (contentMatchCount / searchTermsLower.length) * this.WEIGHTS.CONTENT_MATCH;
    }

    // 4. Recency Score (newer = higher score)
    const recencyScore = this.calculateRecencyScore(result.createdAt);
    score += recencyScore * this.WEIGHTS.RECENCY;

    // 5. Type Match Score (bonus for certain types)
    const typeScore = this.calculateTypeScore(result.type, queryLower);
    score += typeScore * this.WEIGHTS.TYPE_MATCH;

    // Normalize score to 0-1 range
    const maxPossibleScore = 
      this.WEIGHTS.TITLE_MATCH +
      this.WEIGHTS.TAG_MATCH +
      this.WEIGHTS.CONTENT_MATCH +
      this.WEIGHTS.RECENCY +
      this.WEIGHTS.TYPE_MATCH;

    const normalizedScore = Math.min(score / maxPossibleScore, 1.0);

    logger.debug('[Context Retrieval] Score calculated', {
      title: result.title,
      score: normalizedScore.toFixed(3),
      titleMatch: titleMatchCount,
      tagMatch: tagMatchCount,
      contentMatch: contentMatchCount
    });

    return normalizedScore;
  }

  /**
   * Calculate recency score (0-1, newer = higher)
   */
  private calculateRecencyScore(createdAt: string): number {
    try {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

      // Exponential decay: score = e^(-age/30)
      // After 30 days, score is ~0.37
      // After 60 days, score is ~0.14
      const score = Math.exp(-ageInDays / 30);

      return score;

    } catch (error) {
      return 0.5; // Default middle score if date parsing fails
    }
  }

  /**
   * Calculate type score based on query context
   */
  private calculateTypeScore(type: string, queryLower: string): number {
    const typeLower = type.toLowerCase();

    // Boost score if query mentions the type
    if (queryLower.includes(typeLower)) {
      return 1.0;
    }

    // Default scores by type
    const typeScores: Record<string, number> = {
      'note': 0.8,
      'research': 0.9,
      'document': 0.7,
      'task': 0.6,
      'idea': 0.5,
      'code': 0.6
    };

    return typeScores[typeLower] || 0.5;
  }

  /**
   * Extract title from Notion result
   */
  private extractTitle(result: any): string {
    try {
      const titleProperty = result.properties.Title || result.properties.title;
      if (titleProperty?.title?.[0]?.plain_text) {
        return titleProperty.title[0].plain_text;
      }
      return 'Untitled';
    } catch (error) {
      return 'Untitled';
    }
  }

  /**
   * Extract tags from Notion result
   */
  private extractTags(result: any): string[] {
    try {
      const tagsProperty = result.properties.Tags || result.properties.tags;
      if (tagsProperty?.multi_select) {
        return tagsProperty.multi_select.map((tag: any) => tag.name);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract type from Notion result
   */
  private extractType(result: any): string {
    try {
      const typeProperty = result.properties.Type || result.properties.type;
      if (typeProperty?.select?.name) {
        return typeProperty.select.name;
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Extract content from Notion result
   */
  private extractContent(result: any): string {
    try {
      // Try to get from Content property
      const contentProperty = result.properties.Content || result.properties.content;
      if (contentProperty?.rich_text?.[0]?.plain_text) {
        return contentProperty.rich_text[0].plain_text;
      }

      // Fallback: combine all text properties
      const allText: string[] = [];
      for (const key in result.properties) {
        const prop = result.properties[key];
        if (prop.rich_text?.[0]?.plain_text) {
          allText.push(prop.rich_text[0].plain_text);
        }
      }

      return allText.join(' ');

    } catch (error) {
      return '';
    }
  }

  /**
   * Extract created date from Notion result
   */
  private extractCreatedAt(result: any): string {
    try {
      const createdProperty = result.properties['Created At'] || result.properties.created_at;
      if (createdProperty?.date?.start) {
        return createdProperty.date.start;
      }

      // Fallback to Notion's created_time
      if (result.created_time) {
        return result.created_time;
      }

      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Format results as context string for AI
   */
  formatAsContextString(results: ContextResult[]): string {
    if (results.length === 0) {
      return 'No relevant context found in memory.';
    }

    return results.map((result, index) => {
      return `[${index + 1}] ${result.title}
Type: ${result.type}
Tags: ${result.tags.join(', ') || 'none'}
Created: ${new Date(result.createdAt).toLocaleDateString()}
Relevance: ${(result.relevanceScore * 100).toFixed(0)}%
Summary: ${result.summary}
URL: ${result.url}
---`;
    }).join('\n\n');
  }

  /**
   * Get detailed context for top matches
   */
  getDetailedContext(results: ContextResult[]): string {
    if (results.length === 0) {
      return 'No relevant context found in memory.';
    }

    return results.map((result, index) => {
      return `[${index + 1}] ${result.title}
Type: ${result.type}
Tags: ${result.tags.join(', ') || 'none'}
Created: ${new Date(result.createdAt).toLocaleDateString()}
Relevance Score: ${(result.relevanceScore * 100).toFixed(0)}%

Content:
${result.content}

URL: ${result.url}
${'='.repeat(80)}`;
    }).join('\n\n');
  }
}

export const contextRetrievalService = new ContextRetrievalService();
export default contextRetrievalService;
