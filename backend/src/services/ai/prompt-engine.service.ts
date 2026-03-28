import { GoogleGenerativeAI } from '@google/generative-ai';
import envVars from '@/config/envVars.js';
import logger from '@/config/logger.js';
import { GeminiAPIError } from '@/utils/errors.js';

export interface PromptEngineConfig {
  systemPrompt: string;
  userInput: string;
  schema: Record<string, any>;
  apiKey?: string;
  maxRetries?: number;
  maxOutputTokens?: number;
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
  private readonly MAX_RETRIES = 1; // Reduced from 2 to minimize API usage
  private readonly DEFAULT_TEMPERATURE = 0.2;
  private readonly DEFAULT_MAX_OUTPUT_TOKENS = 2048;
  
  // Response cache to prevent duplicate API calls
  private responseCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds

  constructor() {
    const apiKey = envVars.GEMINI_API_KEY 
    const modelName = envVars.GEMINI_MODEL 
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: this.DEFAULT_TEMPERATURE,
        maxOutputTokens: this.DEFAULT_MAX_OUTPUT_TOKENS,
        candidateCount: 1,
        responseMimeType: 'application/json'
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

    // Check cache first (skip for custom API keys to respect user-specific quotas)
    if (!config.apiKey) {
      const cacheKey = `${config.systemPrompt.substring(0, 100)}:${config.userInput}`;
      const cached = this.responseCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.info('[Prompt Engine] Using cached response', {
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000) + 's'
        });
        return {
          status: 'success',
          data: cached.data,
          metadata: {
            attempts: 0,
            processingTimeMs: 0,
            model: 'cached'
          }
        };
      }
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
          model: envVars.GEMINI_MODEL,
          generationConfig: {
              temperature: config.temperature ?? this.DEFAULT_TEMPERATURE,
              maxOutputTokens: config.maxOutputTokens ?? this.DEFAULT_MAX_OUTPUT_TOKENS,
              candidateCount: 1,
              responseMimeType: 'application/json'
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

        // Cache successful response (skip for custom API keys)
        if (!config.apiKey) {
          const cacheKey = `${config.systemPrompt.substring(0, 100)}:${config.userInput}`;
          this.responseCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });
          logger.debug('[Prompt Engine] Response cached', { cacheKey: cacheKey.substring(0, 50) });
        }

        return {
          status: 'success',
          data: parsedData as T,
          metadata: {
            attempts: attempt + 1,
            processingTimeMs,
            model: envVars.GEMINI_MODEL
          }
        };

      } catch (error: any) {
        lastError = error;
        
        // Detect API key errors
        const isAPIKeyError = error.message?.includes('API Key not found') || 
                              error.message?.includes('API_KEY_INVALID') ||
                              error.message?.includes('API key not valid') ||
                              error.message?.includes('invalid API key');
        
        // Detect rate limit errors (429)
        const is429 = error.message?.includes('429') || 
                      error.message?.includes('quota') ||
                      error.message?.includes('Too Many Requests') ||
                      error.message?.includes('Resource has been exhausted') ||
                      error.status === 429 ||
                      error.code === 429;
        
        logger.warn('[Prompt Engine] Attempt failed', {
          attempt: attempt + 1,
          error: error.message,
          errorType: isAPIKeyError ? 'API_KEY_ERROR' : is429 ? 'RATE_LIMIT' : 'OTHER',
          willRetry: attempt < maxRetries && !isAPIKeyError && !is429
        });

        // For API key errors, fail immediately with user-friendly error
        if (isAPIKeyError) {
          logger.error('[Prompt Engine] API key error detected', {
            attempt: attempt + 1,
            error: error.message,
            recommendation: 'User needs to update their Gemini API key'
          });
          throw GeminiAPIError.invalidKey();
        }

        // For rate limit errors, fail immediately with user-friendly error
        if (is429) {
          logger.error('[Prompt Engine] Rate limit exceeded - failing fast', {
            attempt: attempt + 1,
            error: error.message,
            recommendation: 'Wait 60 seconds or reduce request frequency'
          });
          throw GeminiAPIError.rateLimited();
        }

        // For other errors, retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000; // Increased from 500ms to 2000ms
          logger.info('[Prompt Engine] Retrying after delay', { 
            delayMs: delay,
            nextAttempt: attempt + 2 
          });
          await this.sleep(delay);
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
      let cleaned = text.trim();

      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      }

      cleaned = cleaned.trim();
      const directParse = this.tryParseJSON(cleaned);
      if (directParse !== null) {
        return directParse;
      }

      const extracted = this.extractBalancedJSON(cleaned);
      if (!extracted) {
        throw new Error('No valid JSON object found in model response');
      }

      const parsed = this.tryParseJSON(extracted);
      if (parsed === null) {
        throw new Error('JSON Parse error: Unable to parse extracted JSON segment');
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

  private tryParseJSON(text: string): any | null {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private extractBalancedJSON(text: string): string | null {
    const objectStart = text.indexOf('{');
    const arrayStart = text.indexOf('[');

    let start = -1;
    let openChar = '';
    let closeChar = '';

    if (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) {
      start = objectStart;
      openChar = '{';
      closeChar = '}';
    } else if (arrayStart !== -1) {
      start = arrayStart;
      openChar = '[';
      closeChar = ']';
    }

    if (start === -1) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const char = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
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

1. STORE - User wants to save information, knowledge, notes, or data. Examples: "save this", "remember that", "note this down"
   Data to extract: { content, suggestedTitle, tags, category }

2. QUERY - User wants to retrieve info or search memory. Examples: "find notes about", "search for", "what was"
   Data to extract: { question, searchTerms }

3. GENERATE_DOC - User wants to CREATE A NEW DOCUMENT or WRITTEN CONTENT (essay, blog, email, article, etc). 
   Examples: "write an essay", "draft an email", "create a blog post"
   Data to extract: { topic, documentType, requirements }
   
4. OPERATE - User wants to EXECUTE A WORKFLOW or PERFORM A DIRECT ACTION on system/Notion objects.
   Examples: "create a new page", "list my Notion pages", "update the task", "delete this workflow"
   This includes: creating/updating/listing/deleting pages, tasks, workflows, connections, integrations
   Data to extract: { action, parameters }

5. UNCLEAR - Ambiguous or fits none. 
   Data to extract: { reason, clarificationNeeded }

CRITICAL DISTINCTION:
- "create a page" = OPERATE (create page object in Notion)
- "write a page" = OPERATE if referring to page in Notion, GENERATE_DOC if referring to content document
- "create a blog post" = GENERATE_DOC (written content)
- "create a document" = GENERATE_DOC (written content)
- "summarize my page" = QUERY
- "summarize my recent page" = QUERY
- "analyze this page" = QUERY

Focus on ACTION VERBS and OBJECT TYPES to disambiguate.`,
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
      },
      maxOutputTokens: 8192
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
