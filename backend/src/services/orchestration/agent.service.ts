import logger from '@/config/logger.js';
import { geminiService } from '@/services/ai/gemini.service.js';
import { sessionService } from '@/services/infrastructure/session.service.js';
import { taskService } from '@/services/workflow/task.service.js';
import { executionService } from '@/services/workflow/execution.service.js';

interface NextAction {
  suggestedAction: string;
  actionType: 'task' | 'query' | 'clarification' | 'completion';
  confidence: number;
  reasoning: string;
  parameters?: Record<string, any>;
}

interface RiskClassification {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  autoExecutable: boolean;
}

interface ProactiveSuggestion {
  id: string;
  type: 'optimization' | 'next-step' | 'alternative' | 'warning';
  message: string;
  action?: string;
  priority: number;
}

class AgentService {
  private readonly AUTO_EXECUTE_THRESHOLD = 0.85;
  private readonly LOW_RISK_ACTIONS = [
    'fetch_data',
    'read_file',
    'search',
    'analyze',
    'summarize'
  ];

  /**
   * Predict the next logical action based on conversation context
   */
  async predictNextAction(sessionId: string, userId: string): Promise<NextAction> {
    try {
      const session = await sessionService.getSession(sessionId);
      if (!session) throw new Error('Session not found');
      
      const history = session.messages;
      const context = {
        mode: session.mode,
        messageCount: session.messages.length,
        userId: session.userId
      };

      const prompt = this.buildPredictionPrompt(history, context);
      const response = await geminiService.generateContent(prompt);

      return this.parseNextAction(response);
    } catch (error) {
      logger.error('Failed to predict next action:', error);
      throw error;
    }
  }

  /**
   * Classify task risk level for auto-execution decision
   */
  classifyTask(task: string, actionType: string): RiskClassification {
    const factors: string[] = [];
    let level: 'low' | 'medium' | 'high' = 'low';

    // Check for destructive operations
    if (this.isDestructive(task)) {
      factors.push('destructive_operation');
      level = 'high';
    }

    // Check for external API calls
    if (this.hasExternalCalls(task)) {
      factors.push('external_api_call');
      if (level === 'low') level = 'medium';
    }

    // Check for data modification
    if (this.modifiesData(task)) {
      factors.push('data_modification');
      if (level === 'low') level = 'medium';
    }

    // Check if action type is in safe list
    const isSafeAction = this.LOW_RISK_ACTIONS.includes(actionType.toLowerCase());
    if (isSafeAction && level === 'low') {
      factors.push('safe_action_type');
    }

    const autoExecutable = level === 'low' && isSafeAction;

    return { level, factors, autoExecutable };
  }

  /**
   * Generate proactive suggestions based on current state
   */
  async generateProactiveSuggestions(
    sessionId: string,
    userId: string
  ): Promise<ProactiveSuggestion[]> {
    try {
      const session = await sessionService.getSession(sessionId);
      if (!session) return [];
      
      const context = {
        mode: session.mode,
        messageCount: session.messages.length
      };
      const history = session.messages;
      const suggestions: ProactiveSuggestion[] = [];

      // Analyze conversation patterns
      const patterns = this.analyzePatterns(history);

      // Suggest optimizations
      if (patterns.repetitiveQueries) {
        suggestions.push({
          id: `opt_${Date.now()}_1`,
          type: 'optimization',
          message: 'I notice you\'re asking similar questions. Would you like me to create a summary?',
          action: 'create_summary',
          priority: 2
        });
      }

      // Suggest next steps
      if (patterns.incompleteTask) {
        suggestions.push({
          id: `next_${Date.now()}_1`,
          type: 'next-step',
          message: 'Based on your previous request, would you like me to proceed with implementation?',
          action: 'continue_task',
          priority: 1
        });
      }

      // Suggest alternatives
      if (patterns.strugglingWithApproach) {
        suggestions.push({
          id: `alt_${Date.now()}_1`,
          type: 'alternative',
          message: 'I can suggest an alternative approach that might be more efficient.',
          action: 'suggest_alternative',
          priority: 2
        });
      }

      // Warnings
      if (patterns.potentialIssue) {
        suggestions.push({
          id: `warn_${Date.now()}_1`,
          type: 'warning',
          message: 'I detected a potential issue with the current approach.',
          priority: 3
        });
      }

      return suggestions.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Failed to generate proactive suggestions:', error);
      return [];
    }
  }

  /**
   * Decide whether to auto-execute an action
   */
  async shouldAutoExecute(
    action: NextAction,
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    // Check confidence threshold
    if (action.confidence < this.AUTO_EXECUTE_THRESHOLD) {
      return false;
    }

    // Classify risk
    const risk = this.classifyTask(action.suggestedAction, action.actionType);
    if (!risk.autoExecutable) {
      return false;
    }

    // Check user preferences (could be stored in session/user settings)
    const preferences = await this.getUserPreferences(userId);
    if (!preferences.autoExecuteEnabled) {
      return false;
    }

    return true;
  }

  /**
   * Execute action autonomously
   */
  async executeAutonomously(
    action: NextAction,
    sessionId: string,
    userId: string
  ): Promise<any> {
    try {
      logger.info(`Auto-executing action: ${action.actionType}`, {
        sessionId,
        confidence: action.confidence
      });

      let result;

      switch (action.actionType) {
        case 'task':
          result = await this.executeTask(action, sessionId, userId);
          break;
        case 'query':
          result = await this.executeQuery(action, sessionId, userId);
          break;
        case 'clarification':
          result = await this.requestClarification(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.actionType}`);
      }

      // Log autonomous execution
      await this.logAutonomousAction(sessionId, userId, action, result);

      return result;
    } catch (error) {
      logger.error('Autonomous execution failed:', error);
      throw error;
    }
  }

  /**
   * Main orchestration: run after every response
   */
  async processPostResponse(
    sessionId: string,
    userId: string,
    lastResponse: string
  ): Promise<{
    nextAction?: NextAction;
    autoExecuted: boolean;
    suggestions: ProactiveSuggestion[];
  }> {
    try {
      // Predict next action
      const nextAction = await this.predictNextAction(sessionId, userId);

      // Generate proactive suggestions
      const suggestions = await this.generateProactiveSuggestions(sessionId, userId);

      // Decide on auto-execution
      const shouldExecute = await this.shouldAutoExecute(nextAction, sessionId, userId);

      let autoExecuted = false;
      if (shouldExecute) {
        await this.executeAutonomously(nextAction, sessionId, userId);
        autoExecuted = true;
      }

      return {
        nextAction: autoExecuted ? undefined : nextAction,
        autoExecuted,
        suggestions
      };
    } catch (error) {
      logger.error('Post-response processing failed:', error);
      return {
        autoExecuted: false,
        suggestions: []
      };
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private buildPredictionPrompt(history: any[], context: any): string {
    return `Analyze this conversation and predict the next logical action.

CONVERSATION HISTORY:
${JSON.stringify(history.slice(-5), null, 2)}

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

Predict the next action in this JSON format:
{
  "suggestedAction": "description of action",
  "actionType": "task|query|clarification|completion",
  "confidence": 0.0-1.0,
  "reasoning": "why this action makes sense",
  "parameters": {}
}`;
  }

  private parseNextAction(response: string): NextAction {
    try {
      const parsed = JSON.parse(response);
      return {
        suggestedAction: parsed.suggestedAction || '',
        actionType: parsed.actionType || 'query',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || '',
        parameters: parsed.parameters || {}
      };
    } catch (error) {
      logger.error('Failed to parse next action:', error);
      return {
        suggestedAction: 'Unable to predict',
        actionType: 'query',
        confidence: 0,
        reasoning: 'Parse error'
      };
    }
  }

  private isDestructive(task: string): boolean {
    const destructiveKeywords = ['delete', 'remove', 'drop', 'truncate', 'destroy'];
    return destructiveKeywords.some(keyword => 
      task.toLowerCase().includes(keyword)
    );
  }

  private hasExternalCalls(task: string): boolean {
    const externalKeywords = ['api', 'fetch', 'request', 'call', 'webhook'];
    return externalKeywords.some(keyword => 
      task.toLowerCase().includes(keyword)
    );
  }

  private modifiesData(task: string): boolean {
    const modificationKeywords = ['update', 'create', 'insert', 'modify', 'write'];
    return modificationKeywords.some(keyword => 
      task.toLowerCase().includes(keyword)
    );
  }

  private analyzePatterns(history: any[]): {
    repetitiveQueries: boolean;
    incompleteTask: boolean;
    strugglingWithApproach: boolean;
    potentialIssue: boolean;
  } {
    // Simple pattern detection (can be enhanced with ML)
    const recentMessages = history.slice(-5);
    
    return {
      repetitiveQueries: this.detectRepetitiveQueries(recentMessages),
      incompleteTask: this.detectIncompleteTask(recentMessages),
      strugglingWithApproach: this.detectStruggling(recentMessages),
      potentialIssue: this.detectIssues(recentMessages)
    };
  }

  private detectRepetitiveQueries(messages: any[]): boolean {
    if (messages.length < 3) return false;
    const queries = messages.map(m => m.content?.toLowerCase() || '');
    const uniqueQueries = new Set(queries);
    return queries.length - uniqueQueries.size >= 2;
  }

  private detectIncompleteTask(messages: any[]): boolean {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    return lastMessage.includes('continue') || lastMessage.includes('next');
  }

  private detectStruggling(messages: any[]): boolean {
    const keywords = ['error', 'not working', 'failed', 'issue', 'problem'];
    return messages.some(m => 
      keywords.some(k => m.content?.toLowerCase().includes(k))
    );
  }

  private detectIssues(messages: any[]): boolean {
    const warningKeywords = ['deprecated', 'insecure', 'vulnerable', 'outdated'];
    return messages.some(m => 
      warningKeywords.some(k => m.content?.toLowerCase().includes(k))
    );
  }

  private async getUserPreferences(userId: string): Promise<{ autoExecuteEnabled: boolean }> {
    // TODO: Fetch from database
    return { autoExecuteEnabled: true };
  }

  private async executeTask(action: NextAction, sessionId: string, userId: string): Promise<any> {
    return await taskService.createTask({
      sessionId,
      userId,
      description: action.suggestedAction
    });
  }

  private async executeQuery(action: NextAction, sessionId: string, userId: string): Promise<any> {
    const prompt = action.suggestedAction;
    return await geminiService.generateContent(prompt);
  }

  private async requestClarification(action: NextAction): Promise<any> {
    return {
      type: 'clarification_needed',
      message: action.suggestedAction
    };
  }

  private async logAutonomousAction(
    sessionId: string,
    userId: string,
    action: NextAction,
    result: any
  ): Promise<void> {
    logger.info('Autonomous action executed', {
      sessionId,
      userId,
      action: action.actionType,
      confidence: action.confidence,
      success: !!result
    });
    // TODO: Store in database for analytics
  }
}

export const agentService = new AgentService();
