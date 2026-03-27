import logger from '@/config/logger.js';
import sessionService, { SessionWithMessages } from '@/services/infrastructure/session.service.js';
import promptEngineService from '@/services/ai/prompt-engine.service.js';
import { IntentType } from '@/types/intent.types.js';

export interface ResumeWorkResult {
  summary: string;
  currentState: string;
  nextSteps: string[];
  context: {
    lastIntent: string | null;
    topicsDiscussed: string[];
    documentsCreated: number;
    queriesAsked: number;
    lastActivity: Date;
  };
  metadata: {
    sessionId: string;
    messageCount: number;
    processingTimeMs: number;
  };
}

interface MessageAnalysis {
  topics: string[];
  intents: string[];
  documents: string[];
  queries: string[];
  lastIntent: string | null;
}

class ResumeService {
  /**
   * Resume work from the most recent session
   */
  async resumeWork(userId: string, sessionId?: string, apiKey?: string): Promise<ResumeWorkResult> {
    const startTime = Date.now();

    try {
      logger.info('[Resume] Starting resume work', { userId, sessionId });

      // Step 1: Get session data
      const session = await this.getSessionData(userId, sessionId);

      if (!session) {
        throw new Error('No session found to resume');
      }

      if (session.messages.length === 0) {
        throw new Error('Session has no messages to analyze');
      }

      logger.info('[Resume] Session retrieved', {
        sessionId: session.id,
        messageCount: session.messages.length,
        lastUpdate: session.updatedAt
      });

      // Step 2: Extract context from messages
      const analysis = this.analyzeMessages(session);

      logger.info('[Resume] Messages analyzed', {
        topics: analysis.topics.length,
        intents: analysis.intents.length,
        documents: analysis.documents.length,
        queries: analysis.queries.length
      });

      // Step 3: Generate resume summary using Prompt Engine
      const resumeSummary = await this.generateResumeSummary(session, analysis, apiKey);

      logger.info('[Resume] Resume summary generated', {
        summaryLength: resumeSummary.summary.length,
        nextStepsCount: resumeSummary.nextSteps.length
      });

      const processingTimeMs = Date.now() - startTime;

      // Step 4: Build result
      const result: ResumeWorkResult = {
        summary: resumeSummary.summary,
        currentState: resumeSummary.currentState,
        nextSteps: resumeSummary.nextSteps,
        context: {
          lastIntent: analysis.lastIntent,
          topicsDiscussed: analysis.topics,
          documentsCreated: analysis.documents.length,
          queriesAsked: analysis.queries.length,
          lastActivity: session.updatedAt
        },
        metadata: {
          sessionId: session.id,
          messageCount: session.messages.length,
          processingTimeMs
        }
      };

      logger.info('[Resume] Resume work completed successfully', {
        sessionId: session.id,
        processingTimeMs
      });

      return result;

    } catch (error: any) {
      logger.error('[Resume] Failed to resume work', {
        error: error.message,
        userId,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Get session data from database
   */
  private async getSessionData(
    userId: string,
    sessionId?: string
  ): Promise<SessionWithMessages | null> {
    if (sessionId) {
      // Get specific session
      const session = await sessionService.getSession(sessionId);

      // Verify session belongs to user
      if (session && session.userId !== userId) {
        throw new Error('Session does not belong to user');
      }

      return session;
    } else {
      // Get most recent session
      return await sessionService.getRecentSession(userId);
    }
  }

  /**
   * Analyze messages to extract context
   */
  private analyzeMessages(session: SessionWithMessages): MessageAnalysis {
    const messages = session.messages;

    // Take last 10 messages for analysis (or all if less than 10)
    const recentMessages = messages.slice(-10);

    const topics = new Set<string>();
    const intents = new Set<string>();
    const documents: string[] = [];
    const queries: string[] = [];
    let lastIntent: string | null = null;

    for (const message of recentMessages) {
      // Extract intent
      if (message.intent) {
        intents.add(message.intent);
        lastIntent = message.intent;

        // Track specific actions
        if (message.intent === IntentType.GENERATE_DOC) {
          documents.push(message.content);
        } else if (message.intent === IntentType.QUERY) {
          queries.push(message.content);
        }
      }

      // Extract topics from content (simple keyword extraction)
      if (message.role === 'user') {
        const keywords = this.extractKeywords(message.content);
        keywords.forEach(kw => topics.add(kw));
      }
    }

    return {
      topics: Array.from(topics).slice(0, 5), // Top 5 topics
      intents: Array.from(intents),
      documents,
      queries,
      lastIntent
    };
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'my', 'your', 'his', 'her', 'its',
      'our', 'their', 'me', 'him', 'her', 'us', 'them'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Count frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Return top keywords
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Generate resume summary using Prompt Engine
   */
  private async generateResumeSummary(
    session: SessionWithMessages,
    analysis: MessageAnalysis,
    apiKey?: string
  ): Promise<{
    summary: string;
    currentState: string;
    nextSteps: string[];
  }> {
    // Build context from recent messages
    const recentMessages = session.messages.slice(-10);
    const conversationContext = recentMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    // Build analysis context
    const analysisContext = `
Topics Discussed: ${analysis.topics.join(', ')}
Intents Used: ${analysis.intents.join(', ')}
Documents Created: ${analysis.documents.length}
Queries Asked: ${analysis.queries.length}
Last Intent: ${analysis.lastIntent || 'None'}
Last Activity: ${session.updatedAt.toISOString()}
`;

    const systemPrompt = `You are a work resumption assistant. Analyze the conversation history and provide a clear summary of what the user was working on.

CONVERSATION HISTORY:
${conversationContext}

ANALYSIS:
${analysisContext}

Your task:
1. Summarize what the user was doing in 2-3 sentences
2. Describe the current state of their work
3. Suggest 3-5 logical next steps they could take

Be specific and actionable. Base everything on the actual conversation history.`;

    const response = await promptEngineService.generateStructuredResponse<{
      summary: string;
      currentState: string;
      nextSteps: string[];
    }>({
      systemPrompt,
      userInput: 'Generate resume summary',
      apiKey,
      schema: {
        summary: 'string',
        currentState: 'string',
        nextSteps: 'array'
      },
      temperature: 0.7
    });

    if (response.status !== 'success') {
      throw new Error('Failed to generate resume summary');
    }

    return response.data;
  }

  /**
   * Check if user input is a resume request
   */
  isResumeRequest(input: string): boolean {
    const resumeKeywords = [
      'continue',
      'resume',
      'what was i doing',
      'where was i',
      'what were we doing',
      'pick up where',
      'carry on',
      'keep going',
      'go on',
      'what next'
    ];

    const inputLower = input.toLowerCase().trim();

    return resumeKeywords.some(keyword => inputLower.includes(keyword));
  }
}

export const resumeService = new ResumeService();
export default resumeService;
