import { GoogleGenerativeAI } from '@google/generative-ai';
import envVars from '../config/envVars.js';
import logger from '../config/logger.js';

export interface PromptEngineConfig {
  systemPrompt: string;
  userInput: string;
  schema: Record<string, any>;
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
    this.genAI = new GoogleGenerativeAI(envVars.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: this.DEFAULT_TEMPERATURE,
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

    logger.info('[Prompt Engine] Starting structured generation', {
      schemaKeys: Object.keys(config.schema),
      maxRetries
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('[Prompt Engine] Attempt', { attempt: attempt + 1, maxRetries: maxRetries + 1 });

        // Build complete prompt
        const fullPrompt = this.buildPrompt(config.systemPrompt, config.userInput, config.schema);

        // Call Gemini
        const result = await this.model.generateContent(fullPrompt);
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
            model: 'gemini-2.0-flash-exp'
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
    additionalContext?: Record<string, any>
  ): Promise<StructuredResponse<T>> {
    const config = this.getTemplateConfig(template, userInput, additionalContext);
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

1. STORE - User wants to save information, knowledge, notes, or data
   Examples: "Remember this", "Save that", "Store this info", "Keep track of"

2. QUERY - User wants to retrieve information, ask questions, or search memory
   Examples: "What did I save about", "Find notes on", "Tell me about", "Search for"

3. GENERATE_DOC - User wants to create a document, report, summary, or structured content
   Examples: "Create a document about", "Generate a report on", "Write a summary of", "Draft a"

4. OPERATE - User wants to execute a workflow, perform an action, or automate a task
   Examples: "Execute workflow", "Run the process", "Automate", "Perform action"

5. UNCLEAR - Input is ambiguous, incomplete, or doesn't fit any category`,
      userInput,
      schema: {
        type: 'string',
        content: 'string',
        suggestedTitle: 'string',
        tags: 'array',
        category: 'string',
        question: 'string',
        searchTerms: 'array',
        contextNeeded: 'boolean',
        documentType: 'string',
        topic: 'string',
        requirements: 'array',
        targetAudience: 'string',
        action: 'string',
        parameters: 'object',
        requiresConfirmation: 'boolean',
        reason: 'string',
        clarificationNeeded: 'array'
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
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const promptEngineService = new PromptEngineService();
export default promptEngineService;
