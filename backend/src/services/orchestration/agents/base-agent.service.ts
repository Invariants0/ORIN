// Base Agent Service - Phase 20

import { v4 as uuidv4 } from 'uuid';
import logger from '@/config/logger.js';
import {
  IAgent,
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  AgentMemory,
  MessagePriority
} from '@/types/agent.types.js';

export abstract class BaseAgent implements IAgent {
  public type: AgentType;
  public status: AgentStatus;
  public authorityLevel: AuthorityLevel;
  public memory: AgentMemory;

  constructor(
    type: AgentType,
    authorityLevel: AuthorityLevel
  ) {
    this.type = type;
    this.status = AgentStatus.IDLE;
    this.authorityLevel = authorityLevel;
    this.memory = {
      agentType: type,
      decisions: [],
      successRate: 0,
      failurePatterns: [],
      contextAwareness: {},
      learnings: []
    };
  }

  async initialize(): Promise<void> {
    logger.info(`[${this.type}Agent] Initializing...`);
    this.status = AgentStatus.IDLE;
    await this.loadMemory();
    logger.info(`[${this.type}Agent] Initialized successfully`);
  }

  abstract processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  abstract proposeAction(context: any): Promise<AgentProposal | null>;
  abstract executeAction(proposal: AgentProposal): Promise<any>;

  getStatus(): AgentStatus {
    return this.status;
  }

  getMemory(): AgentMemory {
    return this.memory;
  }

  async updateMemory(decision: any, outcome: any): Promise<void> {
    // Add decision to memory
    this.memory.decisions.push({
      id: decision.id || uuidv4(),
      action: decision.action,
      context: decision.context,
      outcome: outcome.success ? 'success' : 'failure',
      timestamp: new Date()
    });

    // Keep only last 100 decisions
    if (this.memory.decisions.length > 100) {
      this.memory.decisions = this.memory.decisions.slice(-100);
    }

    // Update success rate
    const successCount = this.memory.decisions.filter(d => d.outcome === 'success').length;
    this.memory.successRate = this.memory.decisions.length > 0
      ? (successCount / this.memory.decisions.length) * 100
      : 0;

    // Track failure patterns
    if (outcome.success === false && outcome.error) {
      const pattern = this.extractFailurePattern(outcome.error);
      const existing = this.memory.failurePatterns.find(p => p.pattern === pattern);

      if (existing) {
        existing.count++;
        existing.lastOccurrence = new Date();
      } else {
        this.memory.failurePatterns.push({
          pattern,
          count: 1,
          lastOccurrence: new Date()
        });
      }
    }

    // Persist memory
    await this.persistMemory();
  }

  protected async loadMemory(): Promise<void> {
    // TODO: Load from database
    logger.debug(`[${this.type}Agent] Memory loaded`);
  }

  protected async persistMemory(): Promise<void> {
    // TODO: Persist to database
    logger.debug(`[${this.type}Agent] Memory persisted`);
  }

  protected extractFailurePattern(error: string): string {
    // Extract generic pattern from error
    return error
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .substring(0, 100);
  }

  protected createMessage(
    to: AgentType | 'broadcast',
    type: AgentMessage['type'],
    payload: any,
    priority: MessagePriority = MessagePriority.MEDIUM,
    correlationId?: string
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: this.type,
      to,
      type,
      priority,
      payload,
      timestamp: new Date(),
      correlationId
    };
  }

  protected createProposal(
    action: string,
    reasoning: string,
    confidence: number,
    expectedOutcome: string,
    risks: string[] = [],
    estimatedDuration: number = 1000
  ): AgentProposal {
    return {
      id: uuidv4(),
      agentType: this.type,
      action,
      reasoning,
      confidence,
      priority: confidence > 80 ? MessagePriority.HIGH : confidence > 50 ? MessagePriority.MEDIUM : MessagePriority.LOW,
      expectedOutcome,
      risks,
      requiredResources: [],
      estimatedDuration,
      dependencies: [],
      createdAt: new Date()
    };
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: any): void {
    const logMessage = `[${this.type}Agent] ${message}`;
    logger[level](logMessage, meta);
  }
}
