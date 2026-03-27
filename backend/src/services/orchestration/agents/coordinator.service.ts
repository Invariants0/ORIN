// Coordinator Service - Phase 20
// Resolves conflicts, prioritizes actions, enforces policies

import logger from '@/config/logger.js';
import {
  AgentType,
  AgentProposal,
  AgentMessage,
  CoordinationDecision,
  MessagePriority
} from '@/types/agent.types.js';
import { RiskLevel, ActionType } from '@/types/autonomy.types.js';
import messageBusService from './message-bus.service.js';
import sharedStateService from './shared-state.service.js';
import { policyEngineService } from '@/services/infrastructure/policy-engine.service.js';

class CoordinatorService {
  private proposalQueue: AgentProposal[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    logger.info('[Coordinator] Initializing...');

    // Subscribe to proposals
    messageBusService.subscribe(AgentType.COORDINATOR, this.handleMessage.bind(this));

    // Start processing queue
    this.startProcessing();

    logger.info('[Coordinator] Initialized successfully');
  }

  private async handleMessage(message: AgentMessage): Promise<void> {
    logger.info('[Coordinator] Message received', {
      from: message.from,
      type: message.type,
      priority: message.priority
    });

    if (message.type === 'proposal' && message.payload.proposal) {
      await this.receiveProposal(message.payload.proposal);
    }
  }

  /**
   * Receive a proposal from an agent
   */
  async receiveProposal(proposal: AgentProposal): Promise<void> {
    logger.info('[Coordinator] Proposal received', {
      proposalId: proposal.id,
      agentType: proposal.agentType,
      action: proposal.action,
      confidence: proposal.confidence
    });

    // Add to shared state
    sharedStateService.addProposal(proposal);

    // Add to processing queue
    this.proposalQueue.push(proposal);

    // Sort queue by priority and confidence
    this.proposalQueue.sort((a, b) => {
      const priorityOrder = {
        [MessagePriority.CRITICAL]: 4,
        [MessagePriority.HIGH]: 3,
        [MessagePriority.MEDIUM]: 2,
        [MessagePriority.LOW]: 1
      };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Start processing proposal queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (this.proposalQueue.length > 0) {
        await this.processQueue();
      }
    }, 2000);

    logger.info('[Coordinator] Processing started');
  }

  /**
   * Process proposal queue
   */
  private async processQueue(): Promise<void> {
    if (this.proposalQueue.length === 0) return;

    logger.info('[Coordinator] Processing queue', { queueSize: this.proposalQueue.length });

    // Get proposals to evaluate (batch processing)
    const batch = this.proposalQueue.splice(0, 5);

    for (const proposal of batch) {
      try {
        const decision = await this.makeDecision([proposal]);
        await this.executeDecision(decision);
      } catch (error: any) {
        logger.error('[Coordinator] Failed to process proposal', {
          proposalId: proposal.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Make coordination decision
   */
  async makeDecision(proposals: AgentProposal[]): Promise<CoordinationDecision> {
    logger.info('[Coordinator] Making decision', { proposalCount: proposals.length });

    // Step 1: Check for conflicts
    const conflicts = this.detectConflicts(proposals);

    // Step 2: Apply policies
    const validProposals = await this.applyPolicies(proposals);

    if (validProposals.length === 0) {
      throw new Error('No valid proposals after policy enforcement');
    }

    // Step 3: Select best proposal
    const selected = this.selectBestProposal(validProposals, conflicts);
    const rejected = validProposals.filter(p => p.id !== selected.id);

    // Step 4: Create execution plan
    const executionPlan = this.createExecutionPlan(selected);

    // Step 5: Build decision
    const decision: CoordinationDecision = {
      selectedProposal: selected,
      rejectedProposals: rejected,
      reasoning: this.buildReasoning(selected, rejected, conflicts),
      conflicts: conflicts.map(c => ({
        proposal1: c.proposal1.id,
        proposal2: c.proposal2.id,
        conflictType: c.type,
        resolution: c.resolution
      })),
      executionPlan
    };

    logger.info('[Coordinator] Decision made', {
      selectedProposal: selected.id,
      rejectedCount: rejected.length,
      conflictCount: conflicts.length
    });

    return decision;
  }

  /**
   * Detect conflicts between proposals
   */
  private detectConflicts(proposals: AgentProposal[]): Array<{
    proposal1: AgentProposal;
    proposal2: AgentProposal;
    type: string;
    resolution: string;
  }> {
    const conflicts: any[] = [];

    for (let i = 0; i < proposals.length; i++) {
      for (let j = i + 1; j < proposals.length; j++) {
        const p1 = proposals[i];
        const p2 = proposals[j];

        // Check for resource conflicts
        const resourceConflict = this.hasResourceConflict(p1, p2);
        if (resourceConflict) {
          conflicts.push({
            proposal1: p1,
            proposal2: p2,
            type: 'resource_conflict',
            resolution: 'Select proposal with higher confidence'
          });
        }

        // Check for action conflicts
        const actionConflict = this.hasActionConflict(p1, p2);
        if (actionConflict) {
          conflicts.push({
            proposal1: p1,
            proposal2: p2,
            type: 'action_conflict',
            resolution: 'Select proposal with higher priority'
          });
        }
      }
    }

    return conflicts;
  }

  private hasResourceConflict(p1: AgentProposal, p2: AgentProposal): boolean {
    // Check if proposals require same resources
    return p1.requiredResources.some(r => p2.requiredResources.includes(r));
  }

  private hasActionConflict(p1: AgentProposal, p2: AgentProposal): boolean {
    // Check if actions are mutually exclusive
    const conflictingPairs = [
      ['pause_workflow', 'resume_workflow'],
      ['scale_up', 'scale_down'],
      ['retry', 'cancel']
    ];

    return conflictingPairs.some(([a1, a2]) =>
      (p1.action.includes(a1) && p2.action.includes(a2)) ||
      (p1.action.includes(a2) && p2.action.includes(a1))
    );
  }

  /**
   * Apply policies to filter proposals
   */
  private async applyPolicies(proposals: AgentProposal[]): Promise<AgentProposal[]> {
    const validProposals: AgentProposal[] = [];

    for (const proposal of proposals) {
      // Check if action is allowed by policy
      const isAllowed = await this.checkPolicy(proposal);

      if (isAllowed) {
        validProposals.push(proposal);
      } else {
        logger.warn('[Coordinator] Proposal rejected by policy', {
          proposalId: proposal.id,
          action: proposal.action
        });
      }
    }

    return validProposals;
  }

  private async checkPolicy(proposal: AgentProposal): Promise<boolean> {
    // TODO: Integrate with policy engine
    // For now, basic checks

    // Reject low confidence proposals for critical actions
    if (proposal.priority === MessagePriority.CRITICAL && proposal.confidence < 70) {
      return false;
    }

    // Reject proposals with too many risks
    if (proposal.risks.length > 3) {
      return false;
    }

    return true;
  }

  /**
   * Select best proposal from valid proposals
   */
  private selectBestProposal(
    proposals: AgentProposal[],
    conflicts: any[]
  ): AgentProposal {
    // Score each proposal
    const scored = proposals.map(p => ({
      proposal: p,
      score: this.scoreProposal(p, conflicts)
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].proposal;
  }

  private scoreProposal(proposal: AgentProposal, conflicts: any[]): number {
    let score = 0;

    // Confidence weight
    score += proposal.confidence * 0.4;

    // Priority weight
    const priorityScores = {
      [MessagePriority.CRITICAL]: 40,
      [MessagePriority.HIGH]: 30,
      [MessagePriority.MEDIUM]: 20,
      [MessagePriority.LOW]: 10
    };
    score += priorityScores[proposal.priority];

    // Risk penalty
    score -= proposal.risks.length * 5;

    // Conflict penalty
    const conflictCount = conflicts.filter(
      c => c.proposal1.id === proposal.id || c.proposal2.id === proposal.id
    ).length;
    score -= conflictCount * 10;

    // Duration bonus (prefer faster actions)
    if (proposal.estimatedDuration < 5000) {
      score += 10;
    }

    return score;
  }

  /**
   * Create execution plan
   */
  private createExecutionPlan(proposal: AgentProposal): CoordinationDecision['executionPlan'] {
    return {
      steps: [{
        agentType: proposal.agentType,
        action: proposal.action,
        order: 1
      }],
      estimatedDuration: proposal.estimatedDuration
    };
  }

  /**
   * Build reasoning for decision
   */
  private buildReasoning(
    selected: AgentProposal,
    rejected: AgentProposal[],
    conflicts: any[]
  ): string {
    const reasons: string[] = [];

    reasons.push(`Selected ${selected.agentType} agent's proposal: ${selected.action}`);
    reasons.push(`Confidence: ${selected.confidence}%, Priority: ${selected.priority}`);

    if (rejected.length > 0) {
      reasons.push(`Rejected ${rejected.length} alternative proposal(s)`);
    }

    if (conflicts.length > 0) {
      reasons.push(`Resolved ${conflicts.length} conflict(s)`);
    }

    reasons.push(`Expected outcome: ${selected.expectedOutcome}`);

    return reasons.join('. ');
  }

  /**
   * Execute coordination decision
   */
  private async executeDecision(decision: CoordinationDecision): Promise<void> {
    const proposal = decision.selectedProposal;

    logger.info('[Coordinator] Executing decision', {
      proposalId: proposal.id,
      agentType: proposal.agentType,
      action: proposal.action
    });

    // Add decision to shared state
    sharedStateService.addDecision(decision, 'pending');

    // Remove from active proposals
    sharedStateService.removeProposal(proposal.id);

    // Start execution tracking
    sharedStateService.startExecution(proposal.id, proposal.agentType);

    // Send execution command to agent
    const message: AgentMessage = {
      id: proposal.id + '_exec',
      from: AgentType.COORDINATOR,
      to: proposal.agentType,
      type: 'request',
      priority: proposal.priority,
      payload: {
        command: 'execute',
        proposal
      },
      timestamp: new Date(),
      correlationId: proposal.id
    };

    await messageBusService.publish(message);

    logger.info('[Coordinator] Execution command sent', { proposalId: proposal.id });
  }

  /**
   * Get coordination statistics
   */
  getStats(): {
    queueSize: number;
    totalDecisions: number;
    successRate: number;
    avgDecisionTime: number;
  } {
    const decisions = sharedStateService.getRecentDecisions();
    const successful = decisions.filter(d => d.outcome === 'success').length;

    return {
      queueSize: this.proposalQueue.length,
      totalDecisions: decisions.length,
      successRate: decisions.length > 0 ? (successful / decisions.length) * 100 : 0,
      avgDecisionTime: 0 // TODO: Track decision times
    };
  }

  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info('[Coordinator] Shut down');
  }
}

export const coordinatorService = new CoordinatorService();
export default coordinatorService;
