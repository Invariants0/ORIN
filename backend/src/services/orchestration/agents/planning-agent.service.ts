// Planning Agent - Phase 20

import { BaseAgent } from './base-agent.service.js';
import {
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  PlanningInput,
  MessagePriority
} from '@/types/agent.types.js';

export class PlanningAgent extends BaseAgent {
  constructor() {
    super(AgentType.PLANNING, AuthorityLevel.SUGGEST);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Processing message', { messageType: message.type, from: message.from });

    switch (message.type) {
      case 'request':
        return await this.handlePlanningRequest(message);

      default:
        return null;
    }
  }

  async proposeAction(context: PlanningInput): Promise<AgentProposal | null> {
    this.status = AgentStatus.ACTIVE;

    try {
      const plan = await this.createPlan(context);

      if (!plan) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      const proposal = this.createProposal(
        'execute_workflow_plan',
        `Created plan for: ${context.goal}`,
        plan.confidence,
        plan.expectedOutcome,
        plan.risks,
        plan.estimatedDuration
      );

      proposal.requiredResources = plan.requiredResources;
      proposal.dependencies = plan.dependencies;

      this.log('info', 'Planning proposal created', { goal: context.goal });
      return proposal;

    } catch (error: any) {
      this.log('error', 'Failed to create plan', { error: error.message });
      this.status = AgentStatus.ERROR;
      return null;
    }
  }

  async executeAction(proposal: AgentProposal): Promise<any> {
    this.status = AgentStatus.BUSY;

    try {
      this.log('info', 'Executing plan', { action: proposal.action });

      // Execute workflow plan
      const result = await this.executePlan(proposal);

      this.status = AgentStatus.IDLE;
      return { success: true, result };

    } catch (error: any) {
      this.log('error', 'Plan execution failed', { error: error.message });
      this.status = AgentStatus.ERROR;
      return { success: false, error: error.message };
    }
  }

  private async createPlan(context: PlanningInput): Promise<{
    confidence: number;
    expectedOutcome: string;
    risks: string[];
    estimatedDuration: number;
    requiredResources: string[];
    dependencies: string[];
  } | null> {
    // Analyze goal and create execution plan
    const steps = this.decomposeGoal(context.goal);

    if (steps.length === 0) {
      return null;
    }

    // Check constraints
    const feasible = this.checkConstraints(steps, context.constraints);

    if (!feasible) {
      this.log('warn', 'Plan not feasible with given constraints');
      return null;
    }

    // Calculate metrics
    const estimatedDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const requiredResources = [...new Set(steps.flatMap(s => s.resources))];
    const risks = this.identifyRisks(steps, context);

    return {
      confidence: 85,
      expectedOutcome: `Goal "${context.goal}" will be achieved in ${steps.length} steps`,
      risks,
      estimatedDuration,
      requiredResources,
      dependencies: []
    };
  }

  private decomposeGoal(goal: string): Array<{
    name: string;
    duration: number;
    resources: string[];
  }> {
    // Simple decomposition (in real system, use AI)
    const steps: any[] = [];

    if (goal.toLowerCase().includes('build') || goal.toLowerCase().includes('create')) {
      steps.push(
        { name: 'Design', duration: 5000, resources: ['planning'] },
        { name: 'Implement', duration: 10000, resources: ['development'] },
        { name: 'Test', duration: 5000, resources: ['testing'] },
        { name: 'Deploy', duration: 3000, resources: ['deployment'] }
      );
    } else if (goal.toLowerCase().includes('optimize')) {
      steps.push(
        { name: 'Analyze', duration: 3000, resources: ['monitoring'] },
        { name: 'Identify bottlenecks', duration: 2000, resources: ['analysis'] },
        { name: 'Apply optimizations', duration: 5000, resources: ['optimization'] }
      );
    } else {
      steps.push(
        { name: 'Execute goal', duration: 5000, resources: ['general'] }
      );
    }

    return steps;
  }

  private checkConstraints(
    steps: any[],
    constraints: PlanningInput['constraints']
  ): boolean {
    // Check time constraint
    if (constraints.timeLimit) {
      const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
      if (totalDuration > constraints.timeLimit) {
        return false;
      }
    }

    // Check resource constraint
    if (constraints.resourceLimit) {
      const requiredResources = new Set(steps.flatMap(s => s.resources));
      if (requiredResources.size > constraints.resourceLimit) {
        return false;
      }
    }

    return true;
  }

  private identifyRisks(steps: any[], context: PlanningInput): string[] {
    const risks: string[] = [];

    if (steps.length > 5) {
      risks.push('Complex plan with many steps may take longer than estimated');
    }

    if (context.constraints.dependencies && context.constraints.dependencies.length > 0) {
      risks.push('Plan depends on external factors');
    }

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    if (totalDuration > 30000) {
      risks.push('Long execution time increases failure probability');
    }

    return risks;
  }

  private async handlePlanningRequest(message: AgentMessage): Promise<AgentMessage> {
    const { goal, constraints, context } = message.payload;

    this.log('info', 'Handling planning request', { goal });

    const planningInput: PlanningInput = {
      goal,
      constraints: constraints || {},
      context: context || {
        existingWorkflows: [],
        availableResources: [],
        userPreferences: {}
      }
    };

    const proposal = await this.proposeAction(planningInput);

    if (proposal) {
      return this.createMessage(
        AgentType.COORDINATOR,
        'proposal',
        { proposal },
        proposal.priority,
        message.id
      );
    }

    return this.createMessage(
      message.from,
      'response',
      { message: 'Unable to create plan for goal' },
      MessagePriority.LOW,
      message.id
    );
  }

  private async executePlan(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Executing workflow plan');

    // Simulate plan execution
    await this.sleep(5000);

    return {
      action: 'plan_executed',
      status: 'completed',
      stepsCompleted: 4,
      totalSteps: 4
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const planningAgent = new PlanningAgent();
