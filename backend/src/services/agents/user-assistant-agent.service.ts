// User Assistant Agent - Phase 20

import { BaseAgent } from './base-agent.service.js';
import {
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  UserAssistantInput
} from '../../types/agent.types.js';

export class UserAssistantAgent extends BaseAgent {
  private alertQueue: Array<{
    severity: string;
    message: string;
    timestamp: Date;
  }> = [];

  constructor() {
    super(AgentType.USER_ASSISTANT, AuthorityLevel.SUGGEST);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Processing message', { messageType: message.type, from: message.from });

    switch (message.type) {
      case 'request':
        return await this.handleUserRequest(message);
      
      case 'alert':
        await this.handleAlert(message);
        return null;
      
      case 'notification':
        await this.handleNotification(message);
        return null;
      
      default:
        return null;
    }
  }

  async proposeAction(context: UserAssistantInput): Promise<AgentProposal | null> {
    this.status = AgentStatus.ACTIVE;

    try {
      const response = await this.generateResponse(context);

      if (!response) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      const proposal = this.createProposal(
        'respond_to_user',
        `Generated response for user query: ${context.userQuery}`,
        response.confidence,
        'User will receive helpful response',
        [],
        1000
      );

      this.log('info', 'User assistant proposal created');
      return proposal;

    } catch (error: any) {
      this.log('error', 'Failed to generate response', { error: error.message });
      this.status = AgentStatus.ERROR;
      return null;
    }
  }

  async executeAction(proposal: AgentProposal): Promise<any> {
    this.status = AgentStatus.BUSY;

    try {
      this.log('info', 'Executing user assistance', { action: proposal.action });

      const result = await this.deliverResponse(proposal);

      this.status = AgentStatus.IDLE;
      return { success: true, result };

    } catch (error: any) {
      this.log('error', 'User assistance failed', { error: error.message });
      this.status = AgentStatus.ERROR;
      return { success: false, error: error.message };
    }
  }

  private async generateResponse(context: UserAssistantInput): Promise<{
    response: string;
    confidence: number;
  } | null> {
    // Analyze user query
    const query = context.userQuery.toLowerCase();

    // Check for common patterns
    if (query.includes('status') || query.includes('health')) {
      return {
        response: 'System is operating normally. All agents are active.',
        confidence: 90
      };
    }

    if (query.includes('help') || query.includes('what can you do')) {
      return {
        response: 'I can help you with system monitoring, optimization, recovery, and planning. What would you like to know?',
        confidence: 95
      };
    }

    // Check alert queue
    if (this.alertQueue.length > 0) {
      const recentAlerts = this.alertQueue.slice(-3);
      return {
        response: `You have ${this.alertQueue.length} alert(s). Most recent: ${recentAlerts[recentAlerts.length - 1].message}`,
        confidence: 85
      };
    }

    return {
      response: 'I understand your query. Let me help you with that.',
      confidence: 70
    };
  }

  private async handleUserRequest(message: AgentMessage): Promise<AgentMessage> {
    const { userQuery, userId, sessionId, context } = message.payload;

    this.log('info', 'Handling user request', { userQuery });

    const input: UserAssistantInput = {
      userQuery,
      userId,
      sessionId,
      context: context || {
        conversationHistory: [],
        userPreferences: {},
        recentActions: []
      }
    };

    const proposal = await this.proposeAction(input);

    if (proposal) {
      // Execute immediately (user assistant has direct response authority)
      const result = await this.executeAction(proposal);
      
      return this.createMessage(
        message.from,
        'response',
        { result },
        'medium',
        message.id
      );
    }

    return this.createMessage(
      message.from,
      'response',
      { message: 'Unable to process request' },
      'low',
      message.id
    );
  }

  private async handleAlert(message: AgentMessage): Promise<void> {
    const { severity, message: alertMessage, action } = message.payload;

    this.log('warn', 'Alert received', { severity, action });

    // Add to alert queue
    this.alertQueue.push({
      severity,
      message: alertMessage,
      timestamp: new Date()
    });

    // Keep only last 50 alerts
    if (this.alertQueue.length > 50) {
      this.alertQueue = this.alertQueue.slice(-50);
    }

    // TODO: Notify user through UI
    this.log('info', 'User notified of alert', { severity });
  }

  private async handleNotification(message: AgentMessage): Promise<void> {
    this.log('info', 'Notification received', { from: message.from });

    // Update context awareness
    this.memory.contextAwareness[message.from] = {
      lastNotification: message.payload,
      timestamp: new Date()
    };
  }

  private async deliverResponse(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Delivering response to user');
    
    return {
      action: 'response_delivered',
      status: 'completed',
      timestamp: new Date()
    };
  }

  /**
   * Get pending alerts for user
   */
  getPendingAlerts(): Array<{
    severity: string;
    message: string;
    timestamp: Date;
  }> {
    return [...this.alertQueue];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alertQueue = [];
    this.log('info', 'Alerts cleared');
  }

  /**
   * Get alert count by severity
   */
  getAlertStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.alertQueue.forEach(alert => {
      stats[alert.severity] = (stats[alert.severity] || 0) + 1;
    });

    return stats;
  }
}

export const userAssistantAgent = new UserAssistantAgent();
