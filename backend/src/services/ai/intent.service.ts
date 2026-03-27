import logger from '@/config/logger.js';
import promptEngineService, { PromptTemplate } from '@/services/ai/prompt-engine.service.js';
import {
  Intent,
  IntentType,
  IntentDetectionResult,
  UnclearIntent
} from '@/types/intent.types.js';

class IntentDetectionService {
  constructor() {
    // Intent detection now uses prompt engine
  }

  async detectIntent(userInput: string, apiKey?: string): Promise<IntentDetectionResult> {
    const startTime = Date.now();

    try {
      logger.info('[Intent] Starting intent detection', { inputLength: userInput.length });

      // Use prompt engine for structured response
      const response = await promptEngineService.generateFromTemplate(
        PromptTemplate.INTENT_CLASSIFICATION,
        userInput,
        undefined,
        apiKey
      );

      logger.info('[Intent] Structured response received', { 
        status: response.status,
        attempts: response.metadata?.attempts 
      });

      const intent = this.normalizeIntentResponse(response.data);
      const confidence = this.calculateConfidence(intent, userInput);

      const processingTimeMs = Date.now() - startTime;

      logger.info('[Intent] Intent detected successfully', {
        intentType: intent.type,
        confidence,
        processingTimeMs
      });

      return {
        intent,
        confidence,
        rawInput: userInput,
        processingTimeMs
      };
    } catch (error: any) {
      logger.error('[Intent] Intent detection failed', { error: error.message, userInput });
      
      const processingTimeMs = Date.now() - startTime;
      
      return {
        intent: {
          type: IntentType.UNCLEAR,
          reason: 'System error during intent detection',
          clarificationNeeded: ['Please rephrase your request']
        } as UnclearIntent,
        confidence: 0,
        rawInput: userInput,
        processingTimeMs
      };
    }
  }

  /**
   * Normalize and validate intent response from prompt engine
   */
  private normalizeIntentResponse(data: any): Intent {
    try {
      if (!data.type || !Object.values(IntentType).includes(data.type)) {
        throw new Error('Invalid intent type');
      }

      // Flatten extractedData if present
      const normalized = {
        type: data.type,
        ...(data.extractedData || {})
      };

      this.validateIntentStructure(normalized);

      return normalized as Intent;
    } catch (error: any) {
      logger.error('[Intent] Failed to normalize intent response', { error: error.message, data });
      
      return {
        type: IntentType.UNCLEAR,
        reason: 'Failed to parse AI response',
        clarificationNeeded: ['Could you rephrase that?']
      } as UnclearIntent;
    }
  }

  private validateIntentStructure(intent: any): void {
    switch (intent.type) {
      case IntentType.STORE:
        if (!intent.content) {
          throw new Error('STORE intent missing content');
        }
        break;
      
      case IntentType.QUERY:
        if (!intent.question || !Array.isArray(intent.searchTerms)) {
          throw new Error('QUERY intent missing required fields');
        }
        break;
      
      case IntentType.GENERATE_DOC:
        if (!intent.documentType || !intent.topic) {
          throw new Error('GENERATE_DOC intent missing required fields');
        }
        break;
      
      case IntentType.OPERATE:
        if (!intent.action || typeof intent.requiresConfirmation !== 'boolean') {
          throw new Error('OPERATE intent missing required fields');
        }
        break;
      
      case IntentType.UNCLEAR:
        if (!intent.reason || !Array.isArray(intent.clarificationNeeded)) {
          throw new Error('UNCLEAR intent missing required fields');
        }
        break;
      
      default:
        throw new Error(`Unknown intent type: ${intent.type}`);
    }
  }

  private calculateConfidence(intent: Intent, userInput: string): number {
    if (intent.type === IntentType.UNCLEAR) {
      return 0;
    }

    let confidence = 0.7;

    const inputLower = userInput.toLowerCase();

    const storeKeywords = ['save', 'store', 'remember', 'keep', 'note', 'add'];
    const queryKeywords = ['what', 'find', 'search', 'tell', 'show', 'get', 'retrieve'];
    const generateKeywords = ['create', 'generate', 'write', 'draft', 'make', 'build'];
    const operateKeywords = ['execute', 'run', 'perform', 'automate', 'do', 'start'];

    switch (intent.type) {
      case IntentType.STORE:
        if (storeKeywords.some(kw => inputLower.includes(kw))) confidence += 0.2;
        break;
      case IntentType.QUERY:
        if (queryKeywords.some(kw => inputLower.includes(kw))) confidence += 0.2;
        break;
      case IntentType.GENERATE_DOC:
        if (generateKeywords.some(kw => inputLower.includes(kw))) confidence += 0.2;
        break;
      case IntentType.OPERATE:
        if (operateKeywords.some(kw => inputLower.includes(kw))) confidence += 0.2;
        break;
    }

    if (userInput.length > 10) confidence += 0.05;
    if (userInput.length > 50) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  async batchDetectIntents(inputs: string[]): Promise<IntentDetectionResult[]> {
    logger.info('[Intent] Batch intent detection started', { count: inputs.length });

    const results = await Promise.all(
      inputs.map(input => this.detectIntent(input))
    );

    logger.info('[Intent] Batch intent detection completed', { count: results.length });

    return results;
  }
}

export const intentService = new IntentDetectionService();
export default intentService;
