import { GoogleGenerativeAI } from '@google/generative-ai';
import envVars from '@/config/envVars.js';
import logger from '@/config/logger.js';

export interface PromptEngineConfig {
  systemPrompt: string;
  userInput: string;
  schema: Record<string, any>;
  apiKey?: string;
  maxRetries?: number;
  temperature?: number;
}

export interface StructuredResponse<T = any> {
  status: 'success' | 'error';
  data: T;
  metadata?: {
    attempts: number;
    processingTimeMs: number;
    model: string;
  };
}

export enum PromptTemplate {
  INTENT_CLASSIFICATION = 'INTENT_CLASSIFICATION',
  CONTENT_CLASSIFICATION = 'CONTENT_CLASSIFICATION',
  CONTEXT_ANALYSIS = 'CONTEXT_ANALYSIS',
  DOCUMENT_GENERATION = 'DOCUMENT_GENERATION'
}

class PromptEngineService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly MAX_RETRIES = 2;
  private readonly DEFAULT_TEMPERATURE = 0.7;

  constructor() {
    const apiKey = envVars.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash', // Latest stable 2026 variant
      generationConfig: {
        temperature: this.DEFAULT_TEMPERATURE,
        maxOutputTokens: 2048,
        candidateCount: 1
      }
    });
  }

  /**
   * Generate structured response from Gemini with strict validation and retry logic
   */
  async generateStructuredResponse<T = any>(
    config: PromptEngineConfig
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();
    const maxRetries = config.maxRetries ?? this.MAX_RETRIES;
    let lastError: Error | null = null;

    const activeKey = config.apiKey || envVars.GEMINI_API_KEY;
    const isMock = activeKey === 'dummy-key-for-testing' || !activeKey;

    logger.info('[Prompt Engine] Starting structured generation', {
      schemaKeys: Object.keys(config.schema),
      maxRetries,
      isMock
    });

    // Mock Mode Support
    if (isMock) {
      return this.generateMockResponse(config);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('[Prompt Engine] Attempt', { attempt: attempt + 1, maxRetries: maxRetries + 1 });

        // Build complete prompt
        const fullPrompt = this.buildPrompt(config.systemPrompt, config.userInput, config.schema);

        // Call Gemini
        let modelToUse = this.model;
        if (config.apiKey) {
          const customGenAI = new GoogleGenerativeAI(config.apiKey);
          modelToUse = customGenAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
              temperature: this.DEFAULT_TEMPERATURE,
              maxOutputTokens: 2048,
              candidateCount: 1
            }
          });
        }

        const result = await modelToUse.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        logger.debug('[Prompt Engine] Raw response received', {
          responseLength: text.length,
          attempt: attempt + 1
        });

        // Parse and validate JSON
        const parsedData = this.extractJSON(text);
        this.validateJSONSchema(parsedData, config.schema);

        const processingTimeMs = Date.now() - startTime;

        logger.info('[Prompt Engine] Structured response generated successfully', {
          attempts: attempt + 1,
          processingTimeMs
        });

        return {
          status: 'success',
          data: parsedData as T,
          metadata: {
            attempts: attempt + 1,
            processingTimeMs,
            model: 'gemini-1.5-flash'
          }
        };

      } catch (error: any) {
        lastError = error;
        logger.warn('[Prompt Engine] Attempt failed', {
          attempt: attempt + 1,
          error: error.message,
          willRetry: attempt < maxRetries
        });

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await this.sleep(Math.pow(2, attempt) * 500);
        }
      }
    }

    // All retries exhausted
    const processingTimeMs = Date.now() - startTime;
    logger.error('[Prompt Engine] All retries exhausted', {
      attempts: maxRetries + 1,
      lastError: lastError?.message
    });

    throw new Error(`Failed to generate structured response after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Generate response using predefined template
   */
  async generateFromTemplate<T = any>(
    template: PromptTemplate,
    userInput: string,
    additionalContext?: Record<string, any>,
    apiKey?: string
  ): Promise<StructuredResponse<T>> {
    const config = this.getTemplateConfig(template, userInput, additionalContext);
    if (apiKey) config.apiKey = apiKey;
    return this.generateStructuredResponse<T>(config);
  }

  /**
   * Validate JSON against schema
   */
  private validateJSONSchema(data: any, schema: Record<string, any>): void {
    const requiredFields = Object.keys(schema);

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }

      const expectedType = schema[field];
      const actualValue = data[field];

      // Type validation
      if (expectedType === 'string' && typeof actualValue !== 'string') {
        throw new Error(`Field '${field}' must be a string, got ${typeof actualValue}`);
      }

      if (expectedType === 'array' && !Array.isArray(actualValue)) {
        throw new Error(`Field '${field}' must be an array, got ${typeof actualValue}`);
      }

      if (expectedType === 'object' && (typeof actualValue !== 'object' || Array.isArray(actualValue))) {
        throw new Error(`Field '${field}' must be an object, got ${typeof actualValue}`);
      }

      if (expectedType === 'boolean' && typeof actualValue !== 'boolean') {
        throw new Error(`Field '${field}' must be a boolean, got ${typeof actualValue}`);
      }

      if (expectedType === 'number' && typeof actualValue !== 'number') {
        throw new Error(`Field '${field}' must be a number, got ${typeof actualValue}`);
      }
    }

    logger.debug('[Prompt Engine] Schema validation passed', {
      validatedFields: requiredFields.length
    });
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJSON(text: string): any {
    try {
      // Remove markdown code blocks
      let cleaned = text.trim();

      // Try to extract from ```json ... ``` or ``` ... ```
      const jsonMatch = cleaned.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      }

      // Remove any leading/trailing whitespace
      cleaned = cleaned.trim();

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Parsed result is not an object');
      }

      return parsed;

    } catch (error: any) {
      logger.error('[Prompt Engine] JSON extraction failed', {
        error: error.message,
        textPreview: text.substring(0, 200)
      });
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  /**
   * Build complete prompt with system instructions and schema
   */
  private buildPrompt(
    systemPrompt: string,
    userInput: string,
    schema: Record<string, any>
  ): string {
    const schemaDescription = this.generateSchemaDescription(schema);

    return `${systemPrompt}

User Input: "${userInput}"

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON
2. Do NOT include markdown code blocks
3. Do NOT include any explanation or text outside the JSON
4. The JSON MUST match this exact schema:

${schemaDescription}

Return ONLY the JSON object. No markdown, no explanation, no extra text.`;
  }

  /**
   * Generate human-readable schema description
   */
  private generateSchemaDescription(schema: Record<string, any>): string {
    const fields = Object.entries(schema).map(([key, type]) => {
      return `  "${key}": <${type}>`;
    });

    return `{\n${fields.join(',\n')}\n}`;
  }

  /**
   * Get template configuration
   */
  private getTemplateConfig(
    template: PromptTemplate,
    userInput: string,
    additionalContext?: Record<string, any>
  ): PromptEngineConfig {
    switch (template) {
      case PromptTemplate.INTENT_CLASSIFICATION:
        return this.getIntentClassificationTemplate(userInput);

      case PromptTemplate.CONTENT_CLASSIFICATION:
        return this.getContentClassificationTemplate(userInput);

      case PromptTemplate.CONTEXT_ANALYSIS:
        return this.getContextAnalysisTemplate(userInput, additionalContext?.context || '');

      case PromptTemplate.DOCUMENT_GENERATION:
        return this.getDocumentGenerationTemplate(userInput, additionalContext);

      default:
        throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * Template: Intent Classification
   */
  private getIntentClassificationTemplate(userInput: string): PromptEngineConfig {
    return {
      systemPrompt: `You are an intent classification system for ORIN, a Context Operating System.
 
Your task: Analyze the user input and classify it into ONE of these intents:
 
1. STORE - User wants to save information, knowledge, notes, or data. Data to extract: { content, suggestedTitle, tags, category }
2. QUERY - User wants to retrieve info or search memory. Data to extract: { question, searchTerms }
3. GENERATE_DOC - User wants to create a document. Data to extract: { topic, documentType, requirements }
4. OPERATE - User wants to execute a workflow. Data to extract: { action, parameters }
5. UNCLEAR - Ambiguous or fits none. Data to extract: { reason, clarificationNeeded }`,
      userInput,
      schema: {
        type: 'string',
        extractedData: 'object'
      }
    };
  }

  /**
   * Template: Content Classification
   */
  private getContentClassificationTemplate(userInput: string): PromptEngineConfig {
    return {
      systemPrompt: `You are a content classification assistant. Analyze the input and categorize it.

Classify the content into one of these types:
- idea: Creative concepts, brainstorming, innovations
- task: Action items, todos, work to be done
- note: General information, observations, reminders
- research: Study materials, findings, analysis
- code: Programming snippets, technical implementations

Extract relevant metadata including title, tags, and summary.`,
      userInput,
      schema: {
        title: 'string',
        type: 'string',
        tags: 'array',
        summary: 'string',
        content: 'string'
      }
    };
  }

  /**
   * Template: Context Analysis
   */
  private getContextAnalysisTemplate(userInput: string, context: string): PromptEngineConfig {
    return {
      systemPrompt: `You are an intelligent analysis assistant. Answer the user's query using the provided context.

Context from Notion:
${context}

Provide a comprehensive answer with:
- Direct summary answering the query
- Key insights extracted from the context
- References to relevant sources`,
      userInput,
      schema: {
        summary: 'string',
        insights: 'array',
        references: 'array'
      }
    };
  }

  /**
   * Template: Document Generation
   */
  private getDocumentGenerationTemplate(
    userInput: string,
    additionalContext?: Record<string, any>
  ): PromptEngineConfig {
    const topic = additionalContext?.topic || userInput;
    const context = additionalContext?.context || '';

    return {
      systemPrompt: `You are a professional document generator. Create a structured document about: "${topic}"

${context ? `Additional context:\n${context}\n` : ''}

Generate a structured document with:
- Clear title
- Section headings (H2, H3)
- Bullet points for key information
- Tables where appropriate
- Professional formatting

The content should be comprehensive and well-organized.`,
      userInput: topic,
      schema: {
        title: 'string',
        content: 'string',
        sections: 'array',
        metadata: 'object'
      }
    };
  }

  /**
   * Simple mock response generator for development without API keys
   */
  private async generateMockResponse<T>(config: PromptEngineConfig): Promise<StructuredResponse<T>> {
    const mockData: any = {};

    for (const [key, type] of Object.entries(config.schema)) {
      if (type === 'string') {
        if (key === 'type') mockData[key] = 'QUERY';
        else if (key === 'intent') mockData[key] = 'QUERY';
        else if (key === 'suggestedTitle') mockData[key] = 'Simulated Response';
        else if (key === 'title') mockData[key] = 'Mock Title';
        else if (key === 'summary') mockData[key] = 'This is a simulated AI response used because no API key is set.';
        else if (key === 'content') mockData[key] = 'The AI is currently in Mock Mode. Please set your GEMINI_API_KEY in the .env file for real capabilities.';
        else if (key === 'output') mockData[key] = 'AI is in Mock Mode. Set your GEMINI_API_KEY in .env to enable real processing.';
        else if (key === 'status') mockData[key] = 'completed';
        else mockData[key] = `Mock ${key} value`;
      } else if (type === 'array') {
        mockData[key] = [`Mock ${key} item 1`, `Mock ${key} item 2`];
      } else if (type === 'object') {
        mockData[key] = { mock: true };
      } else if (type === 'boolean') {
        mockData[key] = true;
      } else if (type === 'number') {
        mockData[key] = 0.95;
      }
    }

    // Artificial delay to simulate network
    await this.sleep(400);

    return {
      status: 'success',
      data: mockData as T,
      metadata: {
        attempts: 1,
        processingTimeMs: 400,
        model: 'mock-mode'
      }
    };
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const promptEngineService = new PromptEngineService();
export default promptEngineService;
