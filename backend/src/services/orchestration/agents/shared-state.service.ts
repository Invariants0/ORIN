// Shared State Service - Phase 20
// Centralized state management for agent coordination

import logger from '@/config/logger.js';
import {
  SharedState,
  AgentType,
  AgentStatus,
  AgentProposal,
  CoordinationDecision,
  MonitoringInput
} from '@/types/agent.types.js';

class SharedStateService {
  private state: SharedState = {
    systemHealth: {
      status: 'healthy',
      metrics: this.getDefaultMetrics(),
      lastUpdate: new Date()
    },
    activeProposals: [],
    executingActions: [],
    recentDecisions: [],
    agentStates: {
      [AgentType.MONITORING]: AgentStatus.IDLE,
      [AgentType.OPTIMIZATION]: AgentStatus.IDLE,
      [AgentType.RECOVERY]: AgentStatus.IDLE,
      [AgentType.PLANNING]: AgentStatus.IDLE,
      [AgentType.USER_ASSISTANT]: AgentStatus.IDLE,
      [AgentType.COORDINATOR]: AgentStatus.IDLE
    }
  };

  /**
   * Get current shared state
   */
  getState(): SharedState {
    return { ...this.state };
  }

  /**
   * Update system health
   */
  updateSystemHealth(
    status: 'healthy' | 'degraded' | 'critical',
    metrics: MonitoringInput
  ): void {
    this.state.systemHealth = {
      status,
      metrics,
      lastUpdate: new Date()
    };

    logger.info('[SharedState] System health updated', { status });
  }

  /**
   * Get system health
   */
  getSystemHealth(): SharedState['systemHealth'] {
    return { ...this.state.systemHealth };
  }

  /**
   * Add proposal to active proposals
   */
  addProposal(proposal: AgentProposal): void {
    this.state.activeProposals.push(proposal);
    logger.info('[SharedState] Proposal added', {
      proposalId: proposal.id,
      agentType: proposal.agentType
    });
  }

  /**
   * Remove proposal from active proposals
   */
  removeProposal(proposalId: string): void {
    this.state.activeProposals = this.state.activeProposals.filter(
      p => p.id !== proposalId
    );
    logger.info('[SharedState] Proposal removed', { proposalId });
  }

  /**
   * Get active proposals
   */
  getActiveProposals(): AgentProposal[] {
    return [...this.state.activeProposals];
  }

  /**
   * Get proposals by agent type
   */
  getProposalsByAgent(agentType: AgentType): AgentProposal[] {
    return this.state.activeProposals.filter(p => p.agentType === agentType);
  }

  /**
   * Start action execution
   */
  startExecution(proposalId: string, agentType: AgentType): void {
    this.state.executingActions.push({
      proposalId,
      agentType,
      startedAt: new Date(),
      progress: 0
    });

    logger.info('[SharedState] Action execution started', { proposalId, agentType });
  }

  /**
   * Update execution progress
   */
  updateExecutionProgress(proposalId: string, progress: number): void {
    const execution = this.state.executingActions.find(e => e.proposalId === proposalId);
    if (execution) {
      execution.progress = progress;
      logger.debug('[SharedState] Execution progress updated', { proposalId, progress });
    }
  }

  /**
   * Complete action execution
   */
  completeExecution(proposalId: string): void {
    this.state.executingActions = this.state.executingActions.filter(
      e => e.proposalId !== proposalId
    );

    logger.info('[SharedState] Action execution completed', { proposalId });
  }

  /**
   * Get executing actions
   */
  getExecutingActions(): SharedState['executingActions'] {
    return [...this.state.executingActions];
  }

  /**
   * Add decision to recent decisions
   */
  addDecision(decision: CoordinationDecision, outcome: 'success' | 'failure' | 'pending'): void {
    this.state.recentDecisions.push({
      decision,
      outcome,
      timestamp: new Date()
    });

    // Keep only last 100 decisions
    if (this.state.recentDecisions.length > 100) {
      this.state.recentDecisions = this.state.recentDecisions.slice(-100);
    }

    logger.info('[SharedState] Decision added', {
      proposalId: decision.selectedProposal.id,
      outcome
    });
  }

  /**
   * Update decision outcome
   */
  updateDecisionOutcome(proposalId: string, outcome: 'success' | 'failure'): void {
    const decision = this.state.recentDecisions.find(
      d => d.decision.selectedProposal.id === proposalId
    );

    if (decision) {
      decision.outcome = outcome;
      logger.info('[SharedState] Decision outcome updated', { proposalId, outcome });
    }
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit: number = 50): SharedState['recentDecisions'] {
    return this.state.recentDecisions.slice(-limit);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentType: AgentType, status: AgentStatus): void {
    this.state.agentStates[agentType] = status;
    logger.debug('[SharedState] Agent status updated', { agentType, status });
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType: AgentType): AgentStatus {
    return this.state.agentStates[agentType];
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<AgentType, AgentStatus> {
    return { ...this.state.agentStates };
  }

  /**
   * Check if any agent is busy
   */
  isAnyAgentBusy(): boolean {
    return Object.values(this.state.agentStates).some(
      status => status === AgentStatus.BUSY || status === AgentStatus.ACTIVE
    );
  }

  /**
   * Get state statistics
   */
  getStats(): {
    systemHealth: string;
    activeProposals: number;
    executingActions: number;
    recentDecisions: number;
    agentStatuses: Record<AgentType, AgentStatus>;
  } {
    return {
      systemHealth: this.state.systemHealth.status,
      activeProposals: this.state.activeProposals.length,
      executingActions: this.state.executingActions.length,
      recentDecisions: this.state.recentDecisions.length,
      agentStatuses: { ...this.state.agentStates }
    };
  }

  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.state = {
      systemHealth: {
        status: 'healthy',
        metrics: this.getDefaultMetrics(),
        lastUpdate: new Date()
      },
      activeProposals: [],
      executingActions: [],
      recentDecisions: [],
      agentStates: {
        [AgentType.MONITORING]: AgentStatus.IDLE,
        [AgentType.OPTIMIZATION]: AgentStatus.IDLE,
        [AgentType.RECOVERY]: AgentStatus.IDLE,
        [AgentType.PLANNING]: AgentStatus.IDLE,
        [AgentType.USER_ASSISTANT]: AgentStatus.IDLE,
        [AgentType.COORDINATOR]: AgentStatus.IDLE
      }
    };

    logger.info('[SharedState] State reset');
  }

  private getDefaultMetrics(): MonitoringInput {
    return {
      systemMetrics: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      },
      applicationMetrics: {
        errorRate: 0,
        latency: 0,
        throughput: 0,
        activeUsers: 0
      },
      workflowMetrics: {
        activeWorkflows: 0,
        failedWorkflows: 0,
        avgExecutionTime: 0
      }
    };
  }
}

export const sharedStateService = new SharedStateService();
export default sharedStateService;
