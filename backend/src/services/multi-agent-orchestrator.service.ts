// Multi-Agent Orchestrator Service - Phase 20
// Main entry point for multi-agent system

import logger from '../config/logger.js';
import { AgentType, AgentStatus } from '../types/agent.types.js';

// Import agents
import { monitoringAgent } from './agents/monitoring-agent.service.js';
import { optimizationAgent } from './agents/optimization-agent.service.js';
import { recoveryAgent } from './agents/recovery-agent.service.js';
import { planningAgent } from './agents/planning-agent.service.js';
import { userAssistantAgent } from './agents/user-assistant-agent.service.js';

// Import infrastructure
import messageBusService from './agents/message-bus.service.js';
import sharedStateService from './agents/shared-state.service.js';
import coordinatorService from './agents/coordinator.service.js';

export interface MultiAgentStats {
  agents: Record<AgentType, {
    status: AgentStatus;
    successRate: number;
    decisionsCount: number;
  }>;
  messageBus: {
    totalMessages: number;
    subscriberCount: number;
  };
  coordinator: {
    queueSize: number;
    totalDecisions: number;
    successRate: number;
  };
  sharedState: {
    systemHealth: string;
    activeProposals: number;
    executingActions: number;
  };
}

class MultiAgentOrchestratorService {
  private initialized = false;
  private agents = {
    [AgentType.MONITORING]: monitoringAgent,
    [AgentType.OPTIMIZATION]: optimizationAgent,
    [AgentType.RECOVERY]: recoveryAgent,
    [AgentType.PLANNING]: planningAgent,
    [AgentType.USER_ASSISTANT]: userAssistantAgent
  };

  /**
   * Initialize the multi-agent system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[MultiAgentOrchestrator] Already initialized');
      return;
    }

    logger.info('[MultiAgentOrchestrator] Initializing multi-agent system...');

    try {
      // Step 1: Initialize coordinator
      await coordinatorService.initialize();

      // Step 2: Initialize all agents
      await Promise.all([
        monitoringAgent.initialize(),
        optimizationAgent.initialize(),
        recoveryAgent.initialize(),
        planningAgent.initialize(),
        userAssistantAgent.initialize()
      ]);

      // Step 3: Subscribe agents to message bus
      this.subscribeAgents();

      this.initialized = true;
      logger.info('[MultiAgentOrchestrator] Multi-agent system initialized successfully');

    } catch (error: any) {
      logger.error('[MultiAgentOrchestrator] Initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe agents to message bus
   */
  private subscribeAgents(): void {
    // Subscribe each agent to its messages
    Object.entries(this.agents).forEach(([agentType, agent]) => {
      messageBusService.subscribe(
        agentType as AgentType,
        async (message) => {
          try {
            const response = await agent.processMessage(message);
            if (response) {
              await messageBusService.publish(response);
            }
          } catch (error: any) {
            logger.error(`[${agentType}] Message processing failed`, { error: error.message });
          }
        }
      );
    });

    logger.info('[MultiAgentOrchestrator] Agents subscribed to message bus');
  }

  /**
   * Send user query to multi-agent system
   */
  async handleUserQuery(
    query: string,
    userId: string,
    sessionId?: string
  ): Promise<{
    response: string;
    agentsInvolved: AgentType[];
    processingTimeMs: number;
  }> {
    const startTime = Date.now();

    logger.info('[MultiAgentOrchestrator] Handling user query', { query, userId });

    try {
      // Send to user assistant agent
      const message = {
        id: `query_${Date.now()}`,
        from: 'system' as any,
        to: AgentType.USER_ASSISTANT,
        type: 'request' as const,
        priority: 'medium' as const,
        payload: {
          userQuery: query,
          userId,
          sessionId,
          context: {
            conversationHistory: [],
            userPreferences: {},
            recentActions: []
          }
        },
        timestamp: new Date()
      };

      await messageBusService.publish(message);

      // Wait for response (simplified - in real system use async/await pattern)
      await this.sleep(1000);

      const processingTimeMs = Date.now() - startTime;

      return {
        response: 'Query processed by multi-agent system',
        agentsInvolved: [AgentType.USER_ASSISTANT],
        processingTimeMs
      };

    } catch (error: any) {
      logger.error('[MultiAgentOrchestrator] Query handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  getStats(): MultiAgentStats {
    const agentStats: Record<AgentType, any> = {} as any;

    Object.entries(this.agents).forEach(([agentType, agent]) => {
      const memory = agent.getMemory();
      agentStats[agentType as AgentType] = {
        status: agent.getStatus(),
        successRate: memory.successRate,
        decisionsCount: memory.decisions.length
      };
    });

    return {
      agents: agentStats,
      messageBus: messageBusService.getStats(),
      coordinator: coordinatorService.getStats(),
      sharedState: sharedStateService.getStats()
    };
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType: AgentType): AgentStatus {
    return this.agents[agentType].getStatus();
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<AgentType, AgentStatus> {
    const statuses: Record<AgentType, AgentStatus> = {} as any;
    
    Object.entries(this.agents).forEach(([agentType, agent]) => {
      statuses[agentType as AgentType] = agent.getStatus();
    });

    return statuses;
  }

  /**
   * Get pending alerts from user assistant
   */
  getPendingAlerts(): any[] {
    return userAssistantAgent.getPendingAlerts();
  }

  /**
   * Get message bus history
   */
  getMessageHistory(limit: number = 100): any[] {
    return messageBusService.getHistory(limit);
  }

  /**
   * Get shared state
   */
  getSharedState(): any {
    return sharedStateService.getState();
  }

  /**
   * Shutdown multi-agent system
   */
  async shutdown(): Promise<void> {
    logger.info('[MultiAgentOrchestrator] Shutting down multi-agent system...');

    try {
      // Shutdown coordinator
      await coordinatorService.shutdown();

      // Shutdown monitoring agent (has interval)
      await monitoringAgent.shutdown();

      // Clear message bus
      messageBusService.clearHistory();

      this.initialized = false;
      logger.info('[MultiAgentOrchestrator] Multi-agent system shut down successfully');

    } catch (error: any) {
      logger.error('[MultiAgentOrchestrator] Shutdown failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const multiAgentOrchestratorService = new MultiAgentOrchestratorService();
export default multiAgentOrchestratorService;
