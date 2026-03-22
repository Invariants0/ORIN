// Message Bus Service - Phase 20
// Event-driven communication between agents

import { EventEmitter } from 'events';
import logger from '../../config/logger.js';
import { AgentMessage, AgentType } from '../../types/agent.types.js';

class MessageBusService extends EventEmitter {
  private messageHistory: AgentMessage[] = [];
  private subscribers: Map<AgentType | 'coordinator', Set<(message: AgentMessage) => void>> = new Map();

  constructor() {
    super();
    this.setMaxListeners(50); // Support many agents
  }

  /**
   * Subscribe to messages for a specific agent
   */
  subscribe(agentType: AgentType | 'coordinator', handler: (message: AgentMessage) => void): void {
    if (!this.subscribers.has(agentType)) {
      this.subscribers.set(agentType, new Set());
    }
    
    this.subscribers.get(agentType)!.add(handler);
    
    logger.info('[MessageBus] Agent subscribed', { agentType });
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(agentType: AgentType | 'coordinator', handler: (message: AgentMessage) => void): void {
    const handlers = this.subscribers.get(agentType);
    if (handlers) {
      handlers.delete(handler);
      logger.info('[MessageBus] Agent unsubscribed', { agentType });
    }
  }

  /**
   * Publish a message to the bus
   */
  async publish(message: AgentMessage): Promise<void> {
    logger.info('[MessageBus] Message published', {
      from: message.from,
      to: message.to,
      type: message.type,
      priority: message.priority
    });

    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > 1000) {
      this.messageHistory = this.messageHistory.slice(-1000);
    }

    // Deliver message
    if (message.to === 'broadcast') {
      await this.broadcast(message);
    } else {
      await this.deliver(message);
    }

    // Emit event for monitoring
    this.emit('message', message);
  }

  /**
   * Deliver message to specific recipient
   */
  private async deliver(message: AgentMessage): Promise<void> {
    const handlers = this.subscribers.get(message.to as AgentType | 'coordinator');
    
    if (!handlers || handlers.size === 0) {
      logger.warn('[MessageBus] No subscribers for message', { to: message.to });
      return;
    }

    // Call all handlers
    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error: any) {
        logger.error('[MessageBus] Handler error', {
          to: message.to,
          error: error.message
        });
      }
    }
  }

  /**
   * Broadcast message to all agents
   */
  private async broadcast(message: AgentMessage): Promise<void> {
    logger.info('[MessageBus] Broadcasting message', { from: message.from });

    for (const [agentType, handlers] of this.subscribers.entries()) {
      // Don't send back to sender
      if (agentType === message.from) continue;

      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error: any) {
          logger.error('[MessageBus] Broadcast handler error', {
            to: agentType,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 100): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Get messages by correlation ID
   */
  getConversation(correlationId: string): AgentMessage[] {
    return this.messageHistory.filter(m => 
      m.correlationId === correlationId || m.id === correlationId
    );
  }

  /**
   * Get messages for specific agent
   */
  getAgentMessages(agentType: AgentType, limit: number = 50): AgentMessage[] {
    return this.messageHistory
      .filter(m => m.from === agentType || m.to === agentType)
      .slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    logger.info('[MessageBus] Message history cleared');
  }

  /**
   * Get bus statistics
   */
  getStats(): {
    totalMessages: number;
    subscriberCount: number;
    messagesByType: Record<string, number>;
    messagesByPriority: Record<string, number>;
  } {
    const messagesByType: Record<string, number> = {};
    const messagesByPriority: Record<string, number> = {};

    this.messageHistory.forEach(msg => {
      messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1;
      messagesByPriority[msg.priority] = (messagesByPriority[msg.priority] || 0) + 1;
    });

    return {
      totalMessages: this.messageHistory.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0),
      messagesByType,
      messagesByPriority
    };
  }
}

export const messageBusService = new MessageBusService();
export default messageBusService;
