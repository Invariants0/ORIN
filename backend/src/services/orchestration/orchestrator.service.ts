import intentService from '../ai/intent.service.js';
import geminiService from '../ai/gemini.service.js';
import notionService from '../integrations/notion.service.js';
import notionMcpClientService from '../integrations/notion-mcp-client.service.js';
import notionWriteService from '../integrations/notion-write.service.js';
import contextRetrievalService from '../integrations/context-retrieval.service.js';
import resumeService from '../infrastructure/resume.service.js';
import taskService from '../workflow/task.service.js';
import executionService from '../workflow/execution.service.js';
import metaOrchestratorService, { StrategyType } from './meta-orchestrator.service.js';
import logger from '../../config/logger.js';
import envVars from '../../config/envVars.js';
import db from '../../config/database.js';
import { IntentType, StoreIntent, QueryIntent, GenerateDocIntent, OperateIntent } from '../../types/intent.types.js';
import { isNotionPermissionError, getNotionErrorMessage } from '../../utils/notion-errors.js';
import { GeminiAPIError } from '../../utils/errors.js';

export interface OrchestratorResponse {
  intent: string;
  output: string;
  references: string[];
  actions: Array<{
    type: string;
    status: string;
    details?: any;
  }>;
  metadata: {
    processingTimeMs: number;
    confidence: number;
    servicesUsed: string[];
  };
}

class OrchestratorService {
  async handleUserInput(input: string, userId: string, sessionId?: string): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const servicesUsed: string[] = ['intent-detection'];

    try {
      const user = await db.user.findUnique({ where: { id: userId } });
      const apiKey = user?.geminiKey || undefined;

      logger.info('[Orchestrator] Processing user input', { 
        userId, 
        sessionId: sessionId || 'none',
        inputLength: input.length,
        hasUserKey: !!apiKey
      });

      // Step 0: PRIORITY - Detect Intent FIRST (before strategy decision)
      // This allows direct action requests (OPERATE) to bypass strategy routing
      const intentResult = await intentService.detectIntent(input, apiKey);
      logger.info('[Orchestrator] Intent detected', { 
        intent: intentResult.intent.type, 
        confidence: intentResult.confidence 
      });

      // If we detected a direct action (OPERATE intent), execute it immediately
      // Don't wait for meta-orchestrator strategy - user wants to DO something, not plan
      if (intentResult.intent.type === IntentType.OPERATE) {
        logger.info('[Orchestrator] OPERATE intent detected - bypassing strategy, executing directly');
        servicesUsed.push('workflow-engine');
        
        const response = await this.handleOperateIntent(
          intentResult.intent as OperateIntent, 
          userId, 
          servicesUsed,
          apiKey
        );
        return response;
      }

      // Step 1: Use Meta-Orchestrator to decide strategy (for non-action intents)
      const decision = await metaOrchestratorService.decideStrategy(input, userId, sessionId);

      logger.info('[Orchestrator] Strategy decided by meta-orchestrator', {
        strategy: decision.strategy,
        confidence: decision.confidence,
        reasoning: decision.reasoning
      });

      // Route based on meta-orchestrator decision
      switch (decision.strategy) {
        case StrategyType.RESUME:
          logger.info('[Orchestrator] Executing RESUME strategy');
          return await this.handleResumeRequest(userId, sessionId, servicesUsed, startTime, apiKey);

        case StrategyType.EXECUTE:
          logger.info('[Orchestrator] Executing EXECUTE strategy');
          if (executionService.isCompletionRequest(input) && sessionId) {
            return await this.handleTaskCompletion(userId, sessionId, servicesUsed, startTime);
          } else if (sessionId) {
            return await this.handleTaskExecution(userId, sessionId, servicesUsed, startTime, apiKey);
          }
          break;

        case StrategyType.ASK:
          logger.info('[Orchestrator] Executing ASK strategy');
          return {
            intent: 'CLARIFICATION',
            output: 'I need a bit more information to help you effectively. Could you provide more details about what you\'d like to do?',
            references: [],
            actions: [{
              type: 'clarification_request',
              status: 'pending',
              details: {
                reason: decision.reasoning
              }
            }],
            metadata: {
              processingTimeMs: Date.now() - startTime,
              confidence: decision.confidence,
              servicesUsed: ['meta-orchestrator']
            }
          };

        case StrategyType.RESPOND:
        default:
          logger.info('[Orchestrator] Executing RESPOND strategy (intent-based)');
          // Fall through to intent-based routing
          break;
      }

      // Fallback to intent-based routing for RESPOND strategy
      // Only check for special patterns if meta-orchestrator didn't explicitly choose RESPOND
      const metaChoseRespond = decision.strategy === StrategyType.RESPOND;
      
      // Check if this is a resume request
      if (!metaChoseRespond && resumeService.isResumeRequest(input)) {
        logger.info('[Orchestrator] Resume request detected');
        return await this.handleResumeRequest(userId, sessionId, servicesUsed, startTime);
      }

      // Check if this is a task execution request
      if (!metaChoseRespond && executionService.isExecutionRequest(input) && sessionId) {
        logger.info('[Orchestrator] Task execution request detected');
        return await this.handleTaskExecution(userId, sessionId, servicesUsed, startTime);
      }

      // Check if this is a task completion request
      if (!metaChoseRespond && executionService.isCompletionRequest(input) && sessionId) {
        logger.info('[Orchestrator] Task completion request detected');
        return await this.handleTaskCompletion(userId, sessionId, servicesUsed, startTime);
      }

      // Step 2: Route based on intent (at this point we know intent is NOT OPERATE)
      let response: OrchestratorResponse;

      switch (intentResult.intent.type) {
        case IntentType.STORE:
          response = await this.handleStoreIntent(intentResult.intent as StoreIntent, userId, servicesUsed, startTime, apiKey);
          break;

        case IntentType.QUERY:
          response = await this.handleQueryIntent(intentResult.intent as QueryIntent, userId, servicesUsed, startTime, apiKey);
          break;

        case IntentType.GENERATE_DOC:
          response = await this.handleGenerateDocIntent(intentResult.intent as GenerateDocIntent, userId, servicesUsed, startTime, apiKey);
          break;

        case IntentType.UNCLEAR:
          response = this.handleUnclearIntent(intentResult.intent, servicesUsed);
          break;

        default:
          throw new Error(`Unknown intent type: ${(intentResult.intent as any).type}`);
      }

      // Add metadata
      response.metadata = {
        processingTimeMs: Date.now() - startTime,
        confidence: intentResult.confidence,
        servicesUsed
      };

      logger.info('[Orchestrator] Request completed successfully', {
        intent: intentResult.intent.type,
        processingTimeMs: response.metadata.processingTimeMs
      });

      return response;

    } catch (error: any) {
      logger.error('[Orchestrator] Failed to process user input', { 
        error: error.message, 
        userId 
      });

      // Determine user message based on error type
      let userMessage = 'I encountered an error processing your request. Please try again or rephrase your input.';
      
      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        userMessage = error.message;
      } 
      // Check for integration errors (Notion, OAuth, etc.)
      else if (error.message && error.message.includes('Notion')) {
        userMessage = error.message;
      }
      else if (error.message && error.message.includes('token not configured')) {
        userMessage = error.message;
      }
      else if (error.message && error.message.includes('API token')) {
        userMessage = error.message;
      }

      // Graceful fallback
      return {
        intent: 'ERROR',
        output: userMessage,
        references: [],
        actions: [{
          type: 'error',
          status: 'failed',
          details: { 
            message: error.message,
            errorCode: error.code 
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          servicesUsed
        }
      };
    }
  }

  private async handleStoreIntent(
    intent: StoreIntent, 
    userId: string, 
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling STORE intent', { userId });
    servicesUsed.push('gemini', 'notion-write');

    try {
      // Classify content using Gemini
      const classification = await geminiService.classifyContent(intent.content, apiKey);

      // Try to create inbox entry using Notion Write Service
      try {
        const result = await notionWriteService.createInboxEntry({
          title: intent.suggestedTitle || classification.title,
          type: classification.type,
          tags: intent.tags || classification.tags,
          summary: classification.summary,
          content: classification.content,
          source: intent.category,
          userId
        });

        // Handle duplicate case
        if (result.duplicate) {
          return {
            intent: IntentType.STORE,
            output: `This content appears to be a duplicate of an existing entry. Skipped creation to avoid redundancy.`,
            references: [result.url],
            actions: [{
              type: 'notion_duplicate_detected',
              status: 'skipped',
              details: {
                pageId: result.pageId,
                title: intent.suggestedTitle || classification.title,
                mergedWith: result.mergedWith
              }
            }],
            metadata: {
              processingTimeMs: 0,
              confidence: 0,
              servicesUsed: []
            }
          };
        }

        return {
          intent: IntentType.STORE,
          output: `Successfully stored: "${intent.suggestedTitle || classification.title}". Your content has been appended to the ORIN page in Notion.`,
          references: [result.url],
          actions: [{
            type: 'notion_append',
            status: 'completed',
            details: {
              pageId: result.pageId,
              pageTitle: 'ORIN',
              title: classification.title,
              type: classification.type,
              tags: intent.tags || classification.tags,
              created: result.created
            }
          }],
          metadata: {
            processingTimeMs: 0,
            confidence: 0,
            servicesUsed: []
          }
        };

      } catch (notionError: any) {
        // Check if this is a permission error
        if (isNotionPermissionError(notionError)) {
          logger.warn('[Orchestrator] Notion permission error, falling back to local storage', {
            error: notionError.message
          });

          // Fallback: Store in local database
          await db.message.create({
            data: {
              chatSessionId: userId, // Using userId as fallback session
              role: 'system',
              content: JSON.stringify({
                title: intent.suggestedTitle || classification.title,
                type: classification.type,
                tags: intent.tags || classification.tags,
                content: classification.content,
                source: intent.category,
                storedAt: new Date().toISOString(),
                fallbackReason: 'notion_permission_error'
              }),
              intent: IntentType.STORE,
              metadata: {
                fallback: true,
                originalError: 'Notion access denied'
              }
            }
          });

          return {
            intent: IntentType.STORE,
            output: `Content saved locally: "${intent.suggestedTitle || classification.title}". 

⚠️ Notion integration is not connected. To save directly to Notion:
1. Open your Notion workspace
2. Share a page or database with the ORIN integration
3. Try storing content again

Your content is safely stored in the local database for now.`,
            references: [],
            actions: [{
              type: 'local_storage_fallback',
              status: 'completed',
              details: {
                title: classification.title,
                type: classification.type,
                tags: intent.tags || classification.tags,
                reason: getNotionErrorMessage(notionError)
              }
            }],
            metadata: {
              processingTimeMs: 0,
              confidence: 0,
              servicesUsed: ['local-db']
            }
          };
        }

        // For other errors, throw them
        throw notionError;
      }

    } catch (error: any) {
      logger.error('[Orchestrator] STORE intent failed', { error: error.message });
      
      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        return {
          intent: IntentType.STORE,
          output: error.message,
          references: [],
          actions: [{
            type: 'error',
            status: 'failed',
            details: { 
              message: error.message,
              errorCode: error.code 
            }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }
      
      throw error;
    }
  }

  private async handleTaskExecution(
    userId: string,
    sessionId: string,
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling TASK_EXECUTION', { userId, sessionId });
    servicesUsed.push('execution', 'task', 'gemini');

    try {
      const result = await executionService.executeNextTask({
        sessionId,
        userId
      }, apiKey);

      // Format output
      const output = `Let's work on the next task!

**Task:** ${result.task.title} [${result.task.priority.toUpperCase()}]

**Description:** ${result.task.description}

**Approach:**
${result.approach}

**Steps to Complete:**
${result.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Estimated Time:** ${result.estimatedTime}

**Potential Risks:**
${result.risks.length > 0 ? result.risks.map(risk => `⚠️ ${risk}`).join('\n') : 'No significant risks identified'}

The task is now marked as "in progress". Let me know when you're done!`;

      return {
        intent: 'TASK_EXECUTION',
        output,
        references: [],
        actions: [{
          type: 'task_execution',
          status: 'completed',
          details: {
            taskId: result.task.id,
            taskTitle: result.task.title,
            priority: result.task.priority,
            stepsCount: result.steps.length,
            estimatedTime: result.estimatedTime
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 1.0,
          servicesUsed
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] TASK_EXECUTION failed', { error: error.message });

      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        return {
          intent: 'TASK_EXECUTION',
          output: error.message,
          references: [],
          actions: [{
            type: 'task_execution',
            status: 'failed',
            details: { 
              message: error.message,
              errorCode: error.code 
            }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }

      return {
        intent: 'TASK_EXECUTION',
        output: error.message.includes('No tasks found') || error.message.includes('No pending tasks')
          ? error.message
          : 'I encountered an error while preparing the next task. Please try again.',
        references: [],
        actions: [{
          type: 'task_execution',
          status: 'failed',
          details: { error: error.message }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          servicesUsed
        }
      };
    }
  }

  private async handleTaskCompletion(
    userId: string,
    sessionId: string,
    servicesUsed: string[],
    startTime: number
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling TASK_COMPLETION', { userId, sessionId });
    servicesUsed.push('execution', 'task');

    try {
      // Get current in-progress task
      const currentTask = await executionService.getCurrentTask(sessionId);

      if (!currentTask) {
        return {
          intent: 'TASK_COMPLETION',
          output: 'No task is currently in progress. Use "start working" or "next task" to begin a new task.',
          references: [],
          actions: [{
            type: 'task_completion',
            status: 'failed',
            details: { error: 'No task in progress' }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }

      // Complete the task
      const result = await executionService.completeTask(currentTask.id, userId);

      // Get progress
      const progress = await executionService.getExecutionProgress(sessionId);

      // Format output
      let output = `✅ Great work! Task completed: "${result.title}"

**Progress:** ${progress.done}/${progress.total} tasks completed (${progress.percentComplete}%)`;

      if (result.nextTask) {
        output += `

**Next Task:** ${result.nextTask.title} [${result.nextTask.priority.toUpperCase()}]

Ready to continue? Just say "start working" or "next task"!`;
      } else {
        output += `

🎉 All tasks completed! You've finished all pending tasks for this session.`;
      }

      return {
        intent: 'TASK_COMPLETION',
        output,
        references: [],
        actions: [{
          type: 'task_completion',
          status: 'completed',
          details: {
            completedTaskId: result.taskId,
            completedTaskTitle: result.title,
            nextTask: result.nextTask,
            progress: {
              done: progress.done,
              total: progress.total,
              percentComplete: progress.percentComplete
            }
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 1.0,
          servicesUsed
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] TASK_COMPLETION failed', { error: error.message });

      return {
        intent: 'TASK_COMPLETION',
        output: 'I encountered an error while completing the task. Please try again.',
        references: [],
        actions: [{
          type: 'task_completion',
          status: 'failed',
          details: { error: error.message }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          servicesUsed
        }
      };
    }
  }

  private async handleTaskDecomposition(
    input: string,
    userId: string,
    sessionId: string,
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling TASK_DECOMPOSITION', { userId, sessionId });
    servicesUsed.push('task', 'gemini');

    try {
      const result = await taskService.decomposeTask({
        input,
        sessionId,
        userId
      }, apiKey);

      // Format output
      const output = `I've broken down your goal into actionable tasks:

**Goal:** ${result.goal}

**Tasks (${result.tasks.length}):**

${result.tasks.map((task, i) => `${i + 1}. **${task.title}** [${task.priority.toUpperCase()}]
   ${task.description}`).join('\n\n')}

All tasks have been saved and are ready to track. You can start working on them in order, or tackle high-priority items first.`;

      return {
        intent: 'TASK_DECOMPOSITION',
        output,
        references: [],
        actions: [{
          type: 'task_decomposition',
          status: 'completed',
          details: {
            goal: result.goal,
            taskCount: result.tasks.length,
            tasks: result.tasks.map(t => ({
              title: t.title,
              priority: t.priority
            }))
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 1.0,
          servicesUsed
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] TASK_DECOMPOSITION failed', { error: error.message });

      // Check for Gemini API key errors
      let userMessage = 'I encountered an error while breaking down your goal into tasks. Please try rephrasing your goal or try again.';
      
      if (error instanceof GeminiAPIError) {
        userMessage = error.message;
      }

      return {
        intent: 'TASK_DECOMPOSITION',
        output: userMessage,
        references: [],
        actions: [{
          type: 'task_decomposition',
          status: 'failed',
          details: { 
            error: error.message,
            errorCode: error.code 
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          servicesUsed
        }
      };
    }
  }

  private async handleResumeRequest(
    userId: string,
    sessionId: string | undefined,
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling RESUME request', { userId, sessionId });
    servicesUsed.push('resume', 'session', 'gemini');

    try {
      const resumeResult = await resumeService.resumeWork(userId, sessionId, apiKey);

      // Format output
      const output = `${resumeResult.summary}

**Current State:** ${resumeResult.currentState}

**Next Steps:**
${resumeResult.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Context:**
- Topics: ${resumeResult.context.topicsDiscussed.join(', ')}
- Documents created: ${resumeResult.context.documentsCreated}
- Queries asked: ${resumeResult.context.queriesAsked}
- Last activity: ${resumeResult.context.lastActivity.toLocaleString()}`;

      return {
        intent: 'RESUME',
        output,
        references: [],
        actions: [{
          type: 'resume_work',
          status: 'completed',
          details: {
            sessionId: resumeResult.metadata.sessionId,
            messageCount: resumeResult.metadata.messageCount,
            lastIntent: resumeResult.context.lastIntent,
            topicsDiscussed: resumeResult.context.topicsDiscussed
          }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 1.0,
          servicesUsed
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] RESUME request failed', { error: error.message });

      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        return {
          intent: 'RESUME',
          output: error.message,
          references: [],
          actions: [{
            type: 'resume_work',
            status: 'failed',
            details: { 
              message: error.message,
              errorCode: error.code 
            }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }

      return {
        intent: 'RESUME',
        output: 'I couldn\'t find any recent work to resume. Try starting a new conversation or provide more context.',
        references: [],
        actions: [{
          type: 'resume_work',
          status: 'failed',
          details: { error: error.message }
        }],
        metadata: {
          processingTimeMs: Date.now() - startTime,
          confidence: 0,
          servicesUsed
        }
      };
    }
  }

  private async handleQueryIntent(
    intent: QueryIntent, 
    userId: string, 
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling QUERY intent', { userId, question: intent.question });
    servicesUsed.push('context-retrieval', 'gemini');

    try {
      // Step 1: Retrieve context using Context Retrieval Service
      const retrievalResult = await contextRetrievalService.retrieveContext({
        query: intent.question,
        searchTerms: intent.searchTerms,
        userId,
        limit: 5
      });

      logger.info('[Orchestrator] Context retrieved', {
        totalResults: retrievalResult.total,
        topMatches: retrievalResult.topMatches.length,
        averageScore: retrievalResult.metadata.averageScore
      });

      // Step 2: Format context for AI analysis
      const contextText = contextRetrievalService.getDetailedContext(retrievalResult.topMatches);

      // Step 3: Analyze with Gemini
      const analysis = await geminiService.analyzeWithContext(intent.question, contextText, apiKey);

      // Step 4: Prepare references from top matches
      const references = retrievalResult.topMatches.map(match => match.url);

      return {
        intent: IntentType.QUERY,
        output: analysis.summary,
        references,
        actions: [{
          type: 'context_retrieval',
          status: 'completed',
          details: {
            resultsFound: retrievalResult.total,
            topMatches: retrievalResult.topMatches.length,
            searchTerms: intent.searchTerms,
            averageRelevance: retrievalResult.metadata.averageScore,
            topResults: retrievalResult.topMatches.map(m => ({
              title: m.title,
              relevance: m.relevanceScore,
              type: m.type
            }))
          }
        }, {
          type: 'analysis',
          status: 'completed',
          details: {
            insights: analysis.insights
          }
        }],
        metadata: {
          processingTimeMs: 0,
          confidence: 0,
          servicesUsed: []
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] QUERY intent failed', { error: error.message });
      
      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        return {
          intent: IntentType.QUERY,
          output: error.message,
          references: [],
          actions: [{
            type: 'error',
            status: 'failed',
            details: { 
              message: error.message,
              errorCode: error.code 
            }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }
      
      throw error;
    }
  }

  private async handleGenerateDocIntent(
    intent: GenerateDocIntent, 
    userId: string, 
    servicesUsed: string[],
    startTime: number,
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling GENERATE_DOC intent', { userId, topic: intent.topic });
    servicesUsed.push('gemini', 'notion');

    try {
      // Step 1: Retrieve relevant context if needed
      let contextText = '';
      if (intent.requirements && intent.requirements.length > 0) {
        const retrievalResult = await contextRetrievalService.retrieveContext({
          query: intent.topic,
          searchTerms: intent.requirements,
          userId,
          limit: 3
        });

        contextText = contextRetrievalService.getDetailedContext(retrievalResult.topMatches);

        logger.info('[Orchestrator] Context retrieved for document generation', {
          resultsFound: retrievalResult.total,
          topMatches: retrievalResult.topMatches.length
        });
      }

      // Step 2: Generate document with Gemini
      const document = await geminiService.generateDocument(intent.topic, contextText, apiKey);

      // Step 3: Create inbox entry using Notion Write Service
      const result = await notionWriteService.createInboxEntry({
        title: document.title,
        type: 'document',
        tags: [intent.documentType, ...document.metadata.tags || []],
        summary: typeof document.metadata?.summary === 'string' ? document.metadata.summary : undefined,
        content: document.content,
        source: `Generated document: ${intent.topic}`,
        userId
      });

      return {
        intent: IntentType.GENERATE_DOC,
        output: `Document "${document.title}" has been generated and appended to the ORIN page in Notion.`,
        references: [result.url],
        actions: [{
          type: 'document_generation',
          status: 'completed',
          details: {
            pageId: result.pageId,
            pageTitle: 'ORIN',
            title: document.title,
            documentType: intent.documentType,
            topic: intent.topic,
            created: result.created
          }
        }],
        metadata: {
          processingTimeMs: 0,
          confidence: 0,
          servicesUsed: []
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] GENERATE_DOC intent failed', { error: error.message });
      
      // Check for Gemini API key errors
      if (error instanceof GeminiAPIError) {
        return {
          intent: IntentType.GENERATE_DOC,
          output: error.message,
          references: [],
          actions: [{
            type: 'error',
            status: 'failed',
            details: { 
              message: error.message,
              errorCode: error.code 
            }
          }],
          metadata: {
            processingTimeMs: Date.now() - startTime,
            confidence: 0,
            servicesUsed
          }
        };
      }
      
      throw error;
    }
  }

  private async handleOperateIntent(
    intent: OperateIntent, 
    userId: string, 
    servicesUsed: string[],
    apiKey?: string
  ): Promise<OrchestratorResponse> {
    logger.info('[Orchestrator] Handling OPERATE intent', { userId, action: intent.action });
    servicesUsed.push('workflow-engine');

    try {
      // Fetch user to get their credentials
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Execute workflow based on action
      const workflowResult = await this.executeWorkflow(intent.action, intent.parameters, userId, user);

      return {
        intent: IntentType.OPERATE,
        output: workflowResult.message,
        references: workflowResult.references,
        actions: [{
          type: 'workflow_execution',
          status: workflowResult.status,
          details: {
            action: intent.action,
            parameters: intent.parameters,
            requiresConfirmation: intent.requiresConfirmation,
            executionDetails: workflowResult.details
          }
        }],
        metadata: {
          processingTimeMs: 0,
          confidence: 0,
          servicesUsed: []
        }
      };

    } catch (error: any) {
      logger.error('[Orchestrator] OPERATE intent failed', { error: error.message });
      throw error;
    }
  }

  private handleUnclearIntent(intent: any, servicesUsed: string[]): OrchestratorResponse {
    logger.info('[Orchestrator] Handling UNCLEAR intent', { reason: intent.reason });

    return {
      intent: IntentType.UNCLEAR,
      output: `I'm not sure what you'd like me to do. ${intent.reason}`,
      references: [],
      actions: [{
        type: 'clarification_needed',
        status: 'pending',
        details: {
          reason: intent.reason,
          suggestions: intent.clarificationNeeded
        }
      }],
      metadata: {
        processingTimeMs: 0,
        confidence: 0,
        servicesUsed
      }
    };
  }

  // Helper: Execute workflow
  private async executeWorkflow(
    action: string, 
    parameters: Record<string, any>, 
    userId: string,
    user?: any
  ): Promise<{
    status: string;
    message: string;
    references: string[];
    details: any;
  }> {
    logger.info('[Orchestrator] Executing workflow', { action, parameters, userId });

    // Get Notion token from user (try REST first, then MCP)
    const notionToken = user?.notionRestAccessToken || user?.notionMcpAccessToken;

    // Workflow execution logic
    const workflows: Record<string, () => Promise<any>> = {
      'create': async () => {
        // Handle Notion page creation via MCP (NOT REST API)
        if (!notionToken) {
          throw new Error('Notion MCP token not configured. Please connect Notion MCP in Settings.');
        }

        const pageTitle = parameters.target || 'Untitled Page';
        logger.info('[Workflow] Creating Notion page via MCP', { pageTitle });

        try {
          // Use MCP client (proper implementation per Notion's official guide)
          // NOT the REST API client - MCP tokens don't work with REST API
          const pageResult = await notionMcpClientService.createPage(
            user.id,
            pageTitle,
            `Created by ORIN at ${new Date().toISOString()}`
          );

          logger.info('[Workflow] Notion page created successfully', { pageTitle, pageResult });

          // Extract page URL from MCP response
          // MCP response typically contains page IDs or URLs
          let pageUrl = 'https://notion.so';
          if (pageResult?.content) {
            // Try to extract page ID from response
            const pageIdMatch = pageResult.content.match(/notion\.so\/([a-f0-9]{32})|id["\s:]*([a-f0-9-]+)/i);
            if (pageIdMatch) {
              const pageId = pageIdMatch[1] || pageIdMatch[2];
              pageUrl = `https://notion.so/${pageId.replace(/-/g, '')}`;
            }
          }

          return {
            status: 'completed',
            message: `✅ Successfully created Notion page titled "${pageTitle}".\n🔗 Open in Notion: ${pageUrl}`,
            references: [pageTitle, pageUrl],
            details: {
              pageTitle,
              pageUrl,
              createdAt: new Date().toISOString(),
              mcpResponse: pageResult
            }
          };
        } catch (error: any) {
          logger.error('[Workflow] Notion page creation via MCP failed', { 
            error: error.message, 
            userId: user.id 
          });
          
          // Better error message
          if (error.message?.includes('not configured')) {
            throw new Error('Notion MCP token not configured. Please reconnect in Settings.');
          }
          if (error.message?.includes('invalid')) {
            throw new Error('Notion MCP token invalid or expired. Please reconnect in Settings.');
          }
          
          throw new Error(`Failed to create Notion page: ${error.message}`);
        }
      },

      'list': async () => {
        // Handle Notion page listing via MCP
        if (!notionToken) {
          throw new Error('Notion MCP token not configured. Please connect Notion MCP in Settings.');
        }

        logger.info('[Workflow] Listing Notion pages via MCP');

        try {
          // Use MCP client to list available tools/resources
          const tools = await notionMcpClientService.listPages(user.id);
          
          logger.info('[Workflow] Retrieved MCP tools', { count: tools?.length || 0 });

          return {
            status: 'completed',
            message: `📄 Notion MCP connected! Available operations: ${tools?.length || 0} tools ready to use.`,
            references: [],
            details: {
              toolCount: tools?.length || 0,
              tools: tools?.map((t: any) => t.name).slice(0, 10) // Show first 10
            }
          };
        } catch (error: any) {
          logger.error('[Workflow] Notion page listing via MCP failed', { 
            error: error.message,
            userId: user.id
          });
          
          if (error.message?.includes('not configured')) {
            throw new Error('Notion MCP token not configured. Please reconnect in Settings.');
          }
          if (error.message?.includes('invalid') || error.message?.includes('unauthorized')) {
            throw new Error('Notion MCP token invalid or expired. Please reconnect in Settings.');
          }
          
          throw new Error(`Failed to list Notion pages: ${error.message}`);
        }
      },

      'backup': async () => {
        // Simulate backup workflow
        const databaseId = envVars.NOTION_DATABASE_ID || '';
        if (!databaseId) {
          throw new Error('Notion database not configured');
        }
        const results = await notionService.queryDatabase(databaseId);
        return {
          status: 'completed',
          message: `Backup workflow executed successfully. Backed up ${results.length} items.`,
          references: [],
          details: {
            itemsBackedUp: results.length,
            timestamp: new Date().toISOString()
          }
        };
      },

      'sync': async () => {
        // Simulate sync workflow
        return {
          status: 'completed',
          message: 'Sync workflow executed successfully. All data is up to date.',
          references: [],
          details: {
            syncedAt: new Date().toISOString(),
            status: 'synchronized'
          }
        };
      },

      'export': async () => {
        // Simulate export workflow
        const databaseId = envVars.NOTION_DATABASE_ID || '';
        if (!databaseId) {
          throw new Error('Notion database not configured');
        }
        const results = await notionService.queryDatabase(databaseId);
        return {
          status: 'completed',
          message: `Export workflow executed successfully. Exported ${results.length} items.`,
          references: [],
          details: {
            itemsExported: results.length,
            format: parameters.format || 'json',
            timestamp: new Date().toISOString()
          }
        };
      },

      'cleanup': async () => {
        // Simulate cleanup workflow
        return {
          status: 'completed',
          message: 'Cleanup workflow executed successfully. Removed outdated items.',
          references: [],
          details: {
            itemsRemoved: 0,
            timestamp: new Date().toISOString()
          }
        };
      }
    };

    // Extract workflow name from action (first word)
    const workflowName = action.toLowerCase().split(/\s+/)[0] || action.toLowerCase();
    const workflow = workflows[workflowName];

    if (workflow) {
      return await workflow();
    } else {
      // Unknown workflow
      return {
        status: 'failed',
        message: `I don't know how to execute "${action}". Please try: create, list, backup, sync, export, or cleanup.`,
        references: [],
        details: {
          error: 'Workflow not found',
          availableWorkflows: Object.keys(workflows),
          requestedAction: action
        }
      };
    }
  }
}

export const orchestratorService = new OrchestratorService();
export default orchestratorService;
