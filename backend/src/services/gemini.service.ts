import logger from "@/config/logger.js";
import promptEngineService, { PromptTemplate } from './prompt-engine.service.js';

export interface ClassificationResult {
  title: string;
  type: "idea" | "task" | "note" | "research" | "code";
  tags: string[];
  summary: string;
  content: string;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  references: string[];
}

export interface DocumentResult {
  title: string;
  content: string;
  sections: string[];
  metadata: Record<string, any>;
}

export class GeminiService {
  constructor() {
    // All Gemini interactions now go through prompt engine
  }

  async classifyContent(input: string): Promise<ClassificationResult> {
    try {
      logger.info("[Gemini] Classifying content via prompt engine");

      const response = await promptEngineService.generateFromTemplate<ClassificationResult>(
        PromptTemplate.CONTENT_CLASSIFICATION,
        input
      );

      if (response.status !== 'success') {
        throw new Error('Failed to classify content');
      }

      logger.info("[Gemini] Content classified successfully");
      return response.data;

    } catch (error) {
      logger.error("[Gemini] Failed to classify content", error);
      throw error;
    }
  }

  async analyzeWithContext(query: string, context: string): Promise<AnalysisResult> {
    try {
      logger.info("[Gemini] Analyzing with context via prompt engine");

      const response = await promptEngineService.generateFromTemplate<AnalysisResult>(
        PromptTemplate.CONTEXT_ANALYSIS,
        query,
        { context }
      );

      if (response.status !== 'success') {
        throw new Error('Failed to analyze context');
      }

      logger.info("[Gemini] Analysis completed successfully");
      return response.data;

    } catch (error) {
      logger.error("[Gemini] Failed to analyze context", error);
      throw error;
    }
  }

  async generateDocument(topic: string, context?: string): Promise<DocumentResult> {
    try {
      logger.info("[Gemini] Generating document via prompt engine");

      const response = await promptEngineService.generateFromTemplate<DocumentResult>(
        PromptTemplate.DOCUMENT_GENERATION,
        topic,
        { topic, context }
      );

      if (response.status !== 'success') {
        throw new Error('Failed to generate document');
      }

      logger.info("[Gemini] Document generated successfully");
      return response.data;

    } catch (error) {
      logger.error("[Gemini] Failed to generate document", error);
      throw error;
    }
  }

  async continueWork(lastSession: string, relatedContext: string): Promise<string> {
    try {
      logger.info("[Gemini] Generating continue work suggestions");

      // For now, use a simplified approach until we have a dedicated template
      const response = await promptEngineService.generateStructuredResponse({
        systemPrompt: `You are a productivity assistant helping to resume work.

Last session summary:
${lastSession}

Related context from Notion:
${relatedContext}

Provide:
1. Brief summary of what was accomplished
2. Current status
3. Suggested next steps (3-5 actionable items)`,
        userInput: 'Generate continue work suggestions',
        schema: {
          summary: 'string',
          status: 'string',
          nextSteps: 'array'
        }
      });

      if (response.status !== 'success') {
        throw new Error('Failed to generate continue work suggestions');
      }

      // Format the response as text
      const data = response.data as any;
      const formatted = `Summary: ${data.summary}\n\nStatus: ${data.status}\n\nNext Steps:\n${data.nextSteps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}`;

      logger.info("[Gemini] Continue work suggestions generated");
      return formatted;

    } catch (error) {
      logger.error("[Gemini] Failed to generate continue work suggestions", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
