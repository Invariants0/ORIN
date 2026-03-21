import logger from '../config/logger.js';
import sessionService from './session.service.js';
import taskService from './task.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum StrategyType {
  DECOMPOSE = 'decompose',
  EXECUTE = 'execute',
  RESUME = 'resume',
  RESPOND = 'respond',
  ASK = 'ask'
}

export interface DecisionContext {
  input: string;
  userId: string;
  sessionId?: string;
  hasSession: boolean;
  hasTasks: boolean;
  hasPendingTasks: boolean;
  hasInProgressTask: boolean;
  messageCount: number;
  adaptiveInsights?: any;
}

export interface StrategyDecision {
  strategy: StrategyType;
  confidence: number;
  reasoning: string;
  metadata: {
    contextFactors: string[];
    alternativeStrategies: Array<{
      strategy: StrategyType;
      score: number;
      reason: string;
    }>;
  };
}

export interface DecisionMetrics {
  id: string;
  userId: string;
  sessionId?: string;
  input: string;
  strategy: string;
  confidence: number;
  reasoning: string;
  success: boolean;
  userFeedback?: string;
  createdAt: Date;
}

class MetaOrchestratorService {
  /**
   * Decide the best strategy for handling user input
   */
  async decideStrategy(
    input: string,
    userId: string,
    sessionId?: string
  ): Promise<StrategyDecision> {
    const startTime = Date.now();

    try {
      logger.info('[MetaOrchestrator] Starting strategy decision', {
        userId,
        sessionId,
        inputLength: input.length
      });

      // Step 1: Gather context
      const context = await this.gatherContext(input, userId, sessionId);

      logger.debug('[MetaOrchestrator] Context gathered', {
        hasSession: context.hasSession,
        hasTasks: context.hasTasks,
        hasPendingTasks: context.hasPendingTasks,
        hasInProgressTask: context.hasInProgressTask,
        messageCount: context.messageCount
      });

      // Step 2: Calculate scores for each strategy
      const scores = await this.calculateStrategyScores(context);

      logger.debug('[MetaOrchestrator] Strategy scores calculated', scores);

      // Step 3: Select best strategy
      const decision = this.selectBestStrategy(scores, context);

      logger.info('[MetaOrchestrator] Strategy decided', {
        strategy: decision.strategy,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        processingTimeMs: Date.now() - startTime
      });

      // Step 4: Track decision for learning
      await this.trackDecision(decision, context);

      return decision;

    } catch (error: any) {
      logger.error('[MetaOrchestrator] Failed to decide strategy', {
        error: error.message,
        userId,
        sessionId
      });

      // Fallback to RESPOND strategy
      return {
        strategy: StrategyType.RESPOND,
        confidence: 0.5,
        reasoning: 'Fallback strategy due to decision error',
        metadata: {
          contextFactors: ['error'],
          alternativeStrategies: []
        }
      };
    }
  }

  /**
   * Gather context for decision making
   */
  private async gatherContext(
    input: string,
    userId: string,
    sessionId?: string
  ): Promise<DecisionContext> {
    const context: DecisionContext = {
      input,
      userId,
      sessionId,
      hasSession: false,
      hasTasks: false,
      hasPendingTasks: false,
      hasInProgressTask: false,
      messageCount: 0
    };

    // Get session context
    if (sessionId) {
      const session = await sessionService.getSession(sessionId);
      if (session) {
        context.hasSession = true;
        context.messageCount = session.messages.length;

        // Get tasks for session
        const tasks = await taskService.getSessionTasks(sessionId);
        context.hasTasks = tasks.length > 0;
        context.hasPendingTasks = tasks.some(t => t.status === 'pending');
        context.hasInProgressTask = tasks.some(t => t.status === 'in_progress');
      }
    }

    // Get adaptive insights
    try {
      const adaptiveService = await import('./adaptive.service.js');
      context.adaptiveInsights = await adaptiveService.default.getLearningInsights(userId);
    } catch (error) {
      // Insights optional
      context.adaptiveInsights = null;
    }

    return context;
  }

  /**
   * Calculate scores for each strategy
   */
  private async calculateStrategyScores(
    context: DecisionContext
  ): Promise<Record<StrategyType, { score: number; reasons: string[] }>> {
    const scores: Record<StrategyType, { score: number; reasons: string[] }> = {
      [StrategyType.DECOMPOSE]: { score: 0, reasons: [] },
      [StrategyType.EXECUTE]: { score: 0, reasons: [] },
      [StrategyType.RESUME]: { score: 0, reasons: [] },
      [StrategyType.RESPOND]: { score: 0, reasons: [] },
      [StrategyType.ASK]: { score: 0, reasons: [] }
    };

    const input = context.input.toLowerCase();

    // DECOMPOSE scoring
    if (this.isGoalInput(input)) {
      scores[StrategyType.DECOMPOSE].score += 40;
      scores[StrategyType.DECOMPOSE].reasons.push('Input looks like a goal/project');
    }

    if (context.hasSession && !context.hasTasks) {
      scores[StrategyType.DECOMPOSE].score += 20;
      scores[StrategyType.DECOMPOSE].reasons.push('Session exists but no tasks yet');
    }

    if (input.length > 30 && input.length < 300) {
      scores[StrategyType.DECOMPOSE].score += 10;
      scores[StrategyType.DECOMPOSE].reasons.push('Input length suitable for goal');
    }

    // EXECUTE scoring
    if (this.isExecutionRequest(input)) {
      scores[StrategyType.EXECUTE].score += 50;
      scores[StrategyType.EXECUTE].reasons.push('Explicit execution request detected');
    }

    if (context.hasPendingTasks) {
      scores[StrategyType.EXECUTE].score += 30;
      scores[StrategyType.EXECUTE].reasons.push('Pending tasks available');
    }

    if (context.hasInProgressTask && this.isCompletionRequest(input)) {
      scores[StrategyType.EXECUTE].score += 40;
      scores[StrategyType.EXECUTE].reasons.push('Task completion request with in-progress task');
    }

    // RESUME scoring
    if (this.isResumeRequest(input)) {
      scores[StrategyType.RESUME].score += 50;
      scores[StrategyType.RESUME].reasons.push('Explicit resume request detected');
    }

    if (context.hasSession && context.messageCount > 3) {
      scores[StrategyType.RESUME].score += 20;
      scores[StrategyType.RESUME].reasons.push('Session has conversation history');
    }

    if (context.hasTasks) {
      scores[StrategyType.RESUME].score += 15;
      scores[StrategyType.RESUME].reasons.push('Session has tasks to resume');
    }

    // RESPOND scoring (default for queries, simple requests)
    if (this.isQueryRequest(input)) {
      scores[StrategyType.RESPOND].score += 40;
      scores[StrategyType.RESPOND].reasons.push('Input is a query/question');
    }

    if (this.isStoreRequest(input)) {
      scores[StrategyType.RESPOND].score += 35;
      scores[StrategyType.RESPOND].reasons.push('Input is a store/save request');
    }

    if (input.length < 20) {
      scores[StrategyType.RESPOND].score += 15;
      scores[StrategyType.RESPOND].reasons.push('Short input - likely simple request');
    }

    // ASK scoring (when unclear)
    if (input.length < 5) {
      scores[StrategyType.ASK].score += 40;
      scores[StrategyType.ASK].reasons.push('Input too short to determine intent');
    }

    if (!context.hasSession && input.length < 15) {
      scores[StrategyType.ASK].score += 25;
      scores[StrategyType.ASK].reasons.push('New session with vague input');
    }

    const ambiguousWords = ['maybe', 'perhaps', 'not sure', 'help', 'what should'];
    if (ambiguousWords.some(word => input.includes(word))) {
      scores[StrategyType.ASK].score += 20;
      scores[StrategyType.ASK].reasons.push('Ambiguous language detected');
    }

    // Boost RESPOND as baseline
    scores[StrategyType.RESPOND].score += 10;
    scores[StrategyType.RESPOND].reasons.push('Baseline strategy');

    return scores;
  }

  /**
   * Select the best strategy based on scores
   */
  private selectBestStrategy(
    scores: Record<StrategyType, { score: number; reasons: string[] }>,
    context: DecisionContext
  ): StrategyDecision {
    // Sort strategies by score
    const sorted = Object.entries(scores)
      .map(([strategy, data]) => ({
        strategy: strategy as StrategyType,
        score: data.score,
        reasons: data.reasons
      }))
      .sort((a, b) => b.score - a.score);

    const best = sorted[0];
    const alternatives = sorted.slice(1, 4);

    // Calculate confidence (0-1)
    const totalScore = sorted.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? Math.min(best.score / totalScore, 1) : 0.5;

    // Build reasoning
    const reasoning = best.reasons.length > 0
      ? best.reasons.join('; ')
      : 'Selected based on context analysis';

    // Gather context factors
    const contextFactors: string[] = [];
    if (context.hasSession) contextFactors.push('has_session');
    if (context.hasTasks) contextFactors.push('has_tasks');
    if (context.hasPendingTasks) contextFactors.push('has_pending_tasks');
    if (context.hasInProgressTask) contextFactors.push('has_in_progress_task');
    if (context.messageCount > 0) contextFactors.push(`message_count:${context.messageCount}`);

    return {
      strategy: best.strategy,
      confidence,
      reasoning,
      metadata: {
        contextFactors,
        alternativeStrategies: alternatives.map(alt => ({
          strategy: alt.strategy,
          score: alt.score,
          reason: alt.reasons.join('; ') || 'Alternative option'
        }))
      }
    };
  }

  /**
   * Track decision for learning
   */
  private async trackDecision(
    decision: StrategyDecision,
    context: DecisionContext
  ): Promise<void> {
    try {
      // Note: DecisionMetrics table will be created in migration
      // For now, just log the decision
      logger.debug('[MetaOrchestrator] Decision tracked', {
        strategy: decision.strategy,
        confidence: decision.confidence,
        userId: context.userId,
        sessionId: context.sessionId
      });

      // TODO: Uncomment after migration
      /*
      await prisma.decisionMetrics.create({
        data: {
          userId: context.userId,
          sessionId: context.sessionId,
          input: context.input,
          strategy: decision.strategy,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          success: true,
          contextFactors: decision.metadata.contextFactors
        }
      });
      */

    } catch (error: any) {
      logger.error('[MetaOrchestrator] Failed to track decision', {
        error: error.message
      });
      // Don't throw - tracking shouldn't break execution
    }
  }

  /**
   * Update decision success based on outcome
   */
  async updateDecisionOutcome(
    userId: string,
    sessionId: string | undefined,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    try {
      logger.debug('[MetaOrchestrator] Decision outcome updated', {
        userId,
        sessionId,
        success,
        feedback
      });

      // TODO: Uncomment after migration
      /*
      const decision = await prisma.decisionMetrics.findFirst({
        where: {
          userId,
          sessionId: sessionId || undefined
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (decision) {
        await prisma.decisionMetrics.update({
          where: { id: decision.id },
          data: {
            success,
            userFeedback: feedback
          }
        });
      }
      */

    } catch (error: any) {
      logger.error('[MetaOrchestrator] Failed to update decision outcome', {
        error: error.message
      });
    }
  }

  /**
   * Get decision analytics
   */
  async getDecisionAnalytics(userId: string): Promise<{
    totalDecisions: number;
    successRate: number;
    strategyDistribution: Record<StrategyType, number>;
    averageConfidence: number;
  }> {
    try {
      // TODO: Uncomment after migration
      /*
      const decisions = await prisma.decisionMetrics.findMany({
        where: { userId }
      });
      */
      const decisions: any[] = [];

      const totalDecisions = decisions.length;
      const successfulDecisions = decisions.filter((d: any) => d.success).length;
      const successRate = totalDecisions > 0
        ? Math.round((successfulDecisions / totalDecisions) * 100)
        : 0;

      const strategyDistribution: Record<StrategyType, number> = {
        [StrategyType.DECOMPOSE]: 0,
        [StrategyType.EXECUTE]: 0,
        [StrategyType.RESUME]: 0,
        [StrategyType.RESPOND]: 0,
        [StrategyType.ASK]: 0
      };

      decisions.forEach((d: any) => {
        const strategy = d.strategy as StrategyType;
        if (strategy in strategyDistribution) {
          strategyDistribution[strategy]++;
        }
      });

      const totalConfidence = decisions.reduce((sum: number, d: any) => sum + d.confidence, 0);
      const averageConfidence = totalDecisions > 0
        ? Math.round((totalConfidence / totalDecisions) * 100) / 100
        : 0;

      return {
        totalDecisions,
        successRate,
        strategyDistribution,
        averageConfidence
      };

    } catch (error: any) {
      logger.error('[MetaOrchestrator] Failed to get decision analytics', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Helper methods for pattern detection

  private isGoalInput(input: string): boolean {
    const goalKeywords = [
      'build', 'create', 'develop', 'implement', 'make',
      'design', 'setup', 'configure', 'integrate',
      'add feature', 'new feature', 'project',
      'system', 'application', 'service', 'engine'
    ];

    return goalKeywords.some(keyword => input.includes(keyword)) &&
           input.length > 15 &&
           input.length < 500 &&
           !input.startsWith('what') &&
           !input.startsWith('how') &&
           !input.includes('?');
  }

  private isExecutionRequest(input: string): boolean {
    const executionKeywords = [
      'start working', 'do next task', 'next task',
      'start task', 'begin task', 'work on',
      'execute task', 'run task', 'start next',
      'what should i do', 'what to do next', 'get started'
    ];

    return executionKeywords.some(keyword => input.includes(keyword));
  }

  private isCompletionRequest(input: string): boolean {
    const completionKeywords = [
      'task done', 'task complete', 'finished task',
      'completed task', 'mark done', 'mark complete',
      'task finished', 'done with task', 'finished working'
    ];

    return completionKeywords.some(keyword => input.includes(keyword));
  }

  private isResumeRequest(input: string): boolean {
    const resumeKeywords = [
      'continue', 'resume', 'what was i doing',
      'where was i', 'what were we doing',
      'pick up where', 'carry on', 'keep going',
      'go on', 'what next'
    ];

    return resumeKeywords.some(keyword => input.includes(keyword));
  }

  private isQueryRequest(input: string): boolean {
    const queryKeywords = [
      'what', 'find', 'search', 'tell', 'show',
      'get', 'retrieve', 'how', 'why', 'when', 'where'
    ];

    return queryKeywords.some(keyword => input.startsWith(keyword)) ||
           input.includes('?');
  }

  private isStoreRequest(input: string): boolean {
    const storeKeywords = [
      'save', 'store', 'remember', 'keep',
      'note', 'add', 'record'
    ];

    return storeKeywords.some(keyword => input.includes(keyword));
  }
}

export const metaOrchestratorService = new MetaOrchestratorService();
export default metaOrchestratorService;
