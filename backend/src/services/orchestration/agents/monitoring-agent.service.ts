// Monitoring Agent - Phase 20

import { BaseAgent } from './base-agent.service.js';
import {
  AgentType,
  AgentStatus,
  AuthorityLevel,
  AgentMessage,
  AgentProposal,
  MonitoringInput,
  MessagePriority
} from '@/types/agent.types.js';

export class MonitoringAgent extends BaseAgent {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    cpu: 80,
    memory: 85,
    errorRate: 0.1,
    latency: 1000
  };

  constructor() {
    super(AgentType.MONITORING, AuthorityLevel.SUGGEST);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.startMonitoring();
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.log('info', 'Processing message', { messageType: message.type, from: message.from });

    switch (message.type) {
      case 'request':
        return await this.handleRequest(message);

      case 'notification':
        await this.handleNotification(message);
        return null;

      default:
        this.log('warn', 'Unknown message type', { type: message.type });
        return null;
    }
  }

  async proposeAction(context: MonitoringInput): Promise<AgentProposal | null> {
    this.status = AgentStatus.ACTIVE;

    try {
      // Analyze system health
      const issues = this.detectIssues(context);

      if (issues.length === 0) {
        this.status = AgentStatus.IDLE;
        return null;
      }

      // Create proposal for most critical issue
      const criticalIssue = issues[0];
      const proposal = this.createProposal(
        criticalIssue.action,
        criticalIssue.reasoning,
        criticalIssue.confidence,
        criticalIssue.expectedOutcome,
        criticalIssue.risks,
        5000
      );

      this.log('info', 'Proposal created', { action: proposal.action, confidence: proposal.confidence });
      return proposal;

    } catch (error: any) {
      this.log('error', 'Failed to propose action', { error: error.message });
      this.status = AgentStatus.ERROR;
      return null;
    }
  }

  async executeAction(proposal: AgentProposal): Promise<any> {
    this.status = AgentStatus.BUSY;

    try {
      this.log('info', 'Executing action', { action: proposal.action });

      // Execute based on action type
      let result;
      switch (proposal.action) {
        case 'alert_high_cpu':
        case 'alert_high_memory':
        case 'alert_high_error_rate':
        case 'alert_high_latency':
          result = await this.sendAlert(proposal);
          break;

        case 'request_optimization':
          result = await this.requestOptimization(proposal);
          break;

        case 'request_recovery':
          result = await this.requestRecovery(proposal);
          break;

        default:
          throw new Error(`Unknown action: ${proposal.action}`);
      }

      this.status = AgentStatus.IDLE;
      return { success: true, result };

    } catch (error: any) {
      this.log('error', 'Action execution failed', { error: error.message });
      this.status = AgentStatus.ERROR;
      return { success: false, error: error.message };
    }
  }

  private startMonitoring(): void {
    // Monitor every 10 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        const proposal = await this.proposeAction(metrics);

        if (proposal) {
          // Send proposal to coordinator
          const message = this.createMessage(
            AgentType.COORDINATOR,
            'proposal',
            { proposal },
            proposal.priority
          );

          // TODO: Send via message bus
          this.log('info', 'Proposal sent to coordinator', { proposalId: proposal.id });
        }
      } catch (error: any) {
        this.log('error', 'Monitoring cycle failed', { error: error.message });
      }
    }, 10000);

    this.log('info', 'Monitoring started');
  }

  private async collectMetrics(): Promise<MonitoringInput> {
    // TODO: Collect real metrics
    return {
      systemMetrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100
      },
      applicationMetrics: {
        errorRate: Math.random() * 0.2,
        latency: Math.random() * 2000,
        throughput: Math.random() * 1000,
        activeUsers: Math.floor(Math.random() * 100)
      },
      workflowMetrics: {
        activeWorkflows: Math.floor(Math.random() * 50),
        failedWorkflows: Math.floor(Math.random() * 5),
        avgExecutionTime: Math.random() * 5000
      }
    };
  }

  private detectIssues(context: MonitoringInput): Array<{
    action: string;
    reasoning: string;
    confidence: number;
    expectedOutcome: string;
    risks: string[];
  }> {
    const issues: any[] = [];

    // Check CPU
    if (context.systemMetrics.cpu > this.alertThresholds.cpu) {
      issues.push({
        action: 'alert_high_cpu',
        reasoning: `CPU usage at ${context.systemMetrics.cpu.toFixed(1)}% exceeds threshold of ${this.alertThresholds.cpu}%`,
        confidence: 90,
        expectedOutcome: 'System administrators will be notified to investigate CPU usage',
        risks: ['System may become unresponsive if CPU continues to increase']
      });
    }

    // Check Memory
    if (context.systemMetrics.memory > this.alertThresholds.memory) {
      issues.push({
        action: 'alert_high_memory',
        reasoning: `Memory usage at ${context.systemMetrics.memory.toFixed(1)}% exceeds threshold of ${this.alertThresholds.memory}%`,
        confidence: 90,
        expectedOutcome: 'System administrators will be notified to investigate memory usage',
        risks: ['Out of memory errors may occur', 'Application may crash']
      });
    }

    // Check Error Rate
    if (context.applicationMetrics.errorRate > this.alertThresholds.errorRate) {
      issues.push({
        action: 'alert_high_error_rate',
        reasoning: `Error rate at ${(context.applicationMetrics.errorRate * 100).toFixed(1)}% exceeds threshold of ${this.alertThresholds.errorRate * 100}%`,
        confidence: 95,
        expectedOutcome: 'Recovery agent will be notified to handle errors',
        risks: ['User experience degradation', 'Data loss potential']
      });
    }

    // Check Latency
    if (context.applicationMetrics.latency > this.alertThresholds.latency) {
      issues.push({
        action: 'alert_high_latency',
        reasoning: `Latency at ${context.applicationMetrics.latency.toFixed(0)}ms exceeds threshold of ${this.alertThresholds.latency}ms`,
        confidence: 85,
        expectedOutcome: 'Optimization agent will be notified to improve performance',
        risks: ['Poor user experience', 'Timeout errors']
      });
    }

    // Sort by confidence (most confident first)
    return issues.sort((a, b) => b.confidence - a.confidence);
  }

  private async handleRequest(message: AgentMessage): Promise<AgentMessage> {
    const { requestType } = message.payload;

    switch (requestType) {
      case 'get_metrics':
        const metrics = await this.collectMetrics();
        return this.createMessage(
          message.from,
          'response',
          { metrics },
          MessagePriority.MEDIUM,
          message.id
        );

      case 'get_health':
        const health = this.assessHealth(await this.collectMetrics());
        return this.createMessage(
          message.from,
          'response',
          { health },
          MessagePriority.MEDIUM,
          message.id
        );

      default:
        return this.createMessage(
          message.from,
          'response',
          { error: 'Unknown request type' },
          MessagePriority.LOW,
          message.id
        );
    }
  }

  private async handleNotification(message: AgentMessage): Promise<void> {
    this.log('info', 'Notification received', { payload: message.payload });
    // Update context awareness
    this.memory.contextAwareness[message.from] = {
      lastNotification: message.payload,
      timestamp: new Date()
    };
  }

  private assessHealth(metrics: MonitoringInput): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];

    if (metrics.systemMetrics.cpu > this.alertThresholds.cpu) {
      issues.push('High CPU usage');
    }
    if (metrics.systemMetrics.memory > this.alertThresholds.memory) {
      issues.push('High memory usage');
    }
    if (metrics.applicationMetrics.errorRate > this.alertThresholds.errorRate) {
      issues.push('High error rate');
    }
    if (metrics.applicationMetrics.latency > this.alertThresholds.latency) {
      issues.push('High latency');
    }

    const status = issues.length === 0 ? 'healthy' :
      issues.length <= 2 ? 'degraded' : 'critical';

    return { status, issues };
  }

  private async sendAlert(proposal: AgentProposal): Promise<any> {
    this.log('warn', 'Alert triggered', { action: proposal.action, reasoning: proposal.reasoning });

    // Send notification to user assistant
    const message = this.createMessage(
      AgentType.USER_ASSISTANT,
      'alert',
      {
        severity: proposal.priority,
        message: proposal.reasoning,
        action: proposal.action
      },
      proposal.priority
    );

    // TODO: Send via message bus
    return { alertSent: true, messageId: message.id };
  }

  private async requestOptimization(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Requesting optimization', { reasoning: proposal.reasoning });

    const message = this.createMessage(
      AgentType.OPTIMIZATION,
      'request',
      {
        requestType: 'optimize_performance',
        context: proposal
      },
      MessagePriority.HIGH
    );

    // TODO: Send via message bus
    return { requestSent: true, messageId: message.id };
  }

  private async requestRecovery(proposal: AgentProposal): Promise<any> {
    this.log('info', 'Requesting recovery', { reasoning: proposal.reasoning });

    const message = this.createMessage(
      AgentType.RECOVERY,
      'request',
      {
        requestType: 'handle_failures',
        context: proposal
      },
      MessagePriority.CRITICAL
    );

    // TODO: Send via message bus
    return { requestSent: true, messageId: message.id };
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.status = AgentStatus.DISABLED;
    this.log('info', 'Monitoring agent shut down');
  }
}

export const monitoringAgent = new MonitoringAgent();
