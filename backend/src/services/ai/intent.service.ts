import logger from '@/config/logger.js';
import promptEngineService, { PromptTemplate } from '@/services/ai/prompt-engine.service.js';
import {
  Intent,
  IntentType,
  IntentDetectionResult,
  UnclearIntent,
  StoreIntent,
  QueryIntent,
  GenerateDocIntent,
  OperateIntent
} from '@/types/intent.types.js';

class IntentDetectionService {
  constructor() {
    // Intent detection now uses prompt engine
  }

  async detectIntent(userInput: string, apiKey?: string): Promise<IntentDetectionResult> {
    const startTime = Date.now();

    try {
      logger.info('[Intent] Starting intent detection', { inputLength: userInput.length });

      // Try rule-based detection first (no API call needed)
      const ruleBasedIntent = this.tryRuleBasedDetection(userInput);
      if (ruleBasedIntent) {
        logger.info('[Intent] Rule-based intent detected', { 
          intentType: ruleBasedIntent.type,
          method: 'rule-based'
        });
        
        const confidence = this.calculateConfidence(ruleBasedIntent, userInput);
        const processingTimeMs = Date.now() - startTime;
        
        return {
          intent: ruleBasedIntent,
          confidence,
          rawInput: userInput,
          processingTimeMs
        };
      }

      // Fallback to AI-based detection for ambiguous cases
      logger.info('[Intent] Using AI-based detection for ambiguous input');

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
   * Try to detect intent using simple rules (no API call)
   * Returns null if intent is ambiguous and needs AI
   */
  private tryRuleBasedDetection(userInput: string): Intent | null {
    const input = userInput.toLowerCase().trim();
    
    // STORE intent patterns
    const storeKeywords = ['save', 'store', 'remember', 'keep', 'note this', 'add this', 'record'];
    if (storeKeywords.some(kw => input.startsWith(kw) || input.includes(kw + ' this') || input.includes(kw + ' that'))) {
      // Extract content (remove the command part)
      let content = userInput;
      for (const kw of storeKeywords) {
        const patterns = [
          new RegExp(`^${kw}\\s+this:?\\s*`, 'i'),
          new RegExp(`^${kw}\\s+that:?\\s*`, 'i'),
          new RegExp(`^${kw}:?\\s+`, 'i')
        ];
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            content = content.replace(pattern, '').trim();
            break;
          }
        }
      }
      
      if (content.length > 5) {
        return {
          type: IntentType.STORE,
          content,
          suggestedTitle: content.substring(0, 50),
          tags: [],
          category: 'user-input'
        } as StoreIntent;
      }
    }
    
    // QUERY intent patterns
    const queryStarters = ['what', 'find', 'search', 'tell me', 'show me', 'get', 'retrieve', 'where', 'when', 'who', 'how'];
    if (queryStarters.some(kw => input.startsWith(kw)) || input.includes('?')) {
      const question = userInput.trim();
      const searchTerms = question
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);
      
      return {
        type: IntentType.QUERY,
        question,
        searchTerms,
        contextNeeded: true
      } as QueryIntent;
    }
    
    // OPERATE intent patterns (direct actions) - CHECK THESE FIRST
    // Must come before GENERATE_DOC because "create" is ambiguous
    const operateKeywords = ['create', 'add', 'update', 'delete', 'remove', 'integrate', 'list', 'fetch', 'get', 'build', 'make', 'set', 'enable', 'disable'];
    const notionPageKeywords = ['page', 'task', 'workflow', 'item', 'note', 'database', 'view', 'connection'];
    
    // Check if this is an OPERATE action on a Notion/system object (not a document)
    // Look for action keywords at start OR early in input (handles missing first char "reate" for "create")
    let action = '';
    for (const kw of operateKeywords) {
      if (input.startsWith(kw)) {
        action = kw;
        break;
      }
      // Also match if missing first character (e.g., "reate" for "create")
      const partialKw = kw.substring(1);
      if (input.startsWith(partialKw) && kw.length > 3) {
        action = kw;
        break;
      }
    }
    
    if (action) {
      const restOfInput = userInput.replace(new RegExp(`^${action}\\s+(?:a|an|the)?\\s*`, 'i'), '').trim();
      
      // If it mentions Notion/system objects, it's definitely OPERATE
      const isSystemObject = notionPageKeywords.some(kw => input.includes(kw));
      
      // If action is "create" but mentions page/task/workflow, it's OPERATE not GENERATE_DOC
      if (action === 'create' && isSystemObject) {
        return {
          type: IntentType.OPERATE,
          action,
          parameters: {
            target: restOfInput,
            fullInput: userInput
          },
          requiresConfirmation: false
        } as OperateIntent;
      }
      
      // For other direct actions, it's OPERATE
      if (action !== 'create') {
        const requiresConfirmation = ['delete', 'remove'].includes(action);
        return {
          type: IntentType.OPERATE,
          action,
          parameters: {
            target: restOfInput,
            fullInput: userInput
          },
          requiresConfirmation
        } as OperateIntent;
      }
    }
    
    // GENERATE_DOC intent patterns (only for actual documents)
    const generateKeywords = ['create document', 'generate document', 'write document', 'draft', 'create doc', 'make document', 'write a blog', 'compose email'];
    if (generateKeywords.some(kw => input.includes(kw))) {
      const topic = userInput.replace(/create|generate|write|draft|make|compose/gi, '').replace(/document|doc|blog|email/gi, '').trim();
      return {
        type: IntentType.GENERATE_DOC,
        topic: topic || 'Untitled Document',
        documentType: 'general',
        requirements: []
      } as GenerateDocIntent;
    }
    
    // If input is too short or ambiguous, return null (needs AI)
    if (input.length < 10) {
      return null;
    }
    
    // Return null for ambiguous cases that need AI analysis
    return null;
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

      // Handle OPERATE intent conversion from AI response format
      if (normalized.type === IntentType.OPERATE) {
        const params = normalized.parameters || {};
        
        // Convert AI response format to expected format
        // AI returns: { objectType, name } or { action, parameters: {...} }
        // We need: { target, fullInput }, requiresConfirmation: boolean
        
        let target = '';
        if (params.name) {
          target = params.name; // Just the name
        } else if (params.target) {
          target = params.target; // Already in correct format
        } else {
          // Try to reconstruct from action + objectType
          const objectType = params.objectType || 'item';
          target = `${objectType}${params.name ? ' named ' + params.name : ''}`;
        }

        // Rebuild parameters with expected structure
        normalized.parameters = {
          target: target || 'unknown',
          fullInput: data.fullInput || data.userInput || `${normalized.action} ${target}`
        };

        // Ensure requiresConfirmation boolean
        if (typeof normalized.requiresConfirmation !== 'boolean') {
          const action = normalized.action || '';
          normalized.requiresConfirmation = ['delete', 'remove', 'destroy'].includes(action.toLowerCase());
        }
      }

      // Coerce QUERY fields when model returns string instead of array
      if (normalized.type === IntentType.QUERY) {
        if (!normalized.question && typeof (normalized as any).query === 'string') {
          (normalized as any).question = (normalized as any).query;
        }

        const terms = (normalized as any).searchTerms;
        if (typeof terms === 'string') {
          (normalized as any).searchTerms = terms
            .split(/[,\s]+/g)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        }

        if (!Array.isArray((normalized as any).searchTerms) && normalized.question) {
          (normalized as any).searchTerms = String(normalized.question)
            .toLowerCase()
            .split(/\s+/g)
            .map((t) => t.replace(/[^\w-]/g, ''))
            .filter((t) => t.length > 2);
        }
      }

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
        // Only require action; requiresConfirmation is optional and defaults based on action
        if (!intent.action) {
          throw new Error('OPERATE intent missing action');
        }
        // Ensure parameters object exists
        if (!intent.parameters || typeof intent.parameters !== 'object') {
          throw new Error('OPERATE intent missing parameters');
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
