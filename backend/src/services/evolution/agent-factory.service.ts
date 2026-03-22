// Dynamic Agent Factory Service - Phase 21
// Creates new agents dynamically based on patterns

import logger from '../../config/logger.js';
import { AgentType, AuthorityLevel } from '../../types/agent.types.js';
import {
  DynamicAgentSpec,
  AgentTrigger,
  AgentConstraints,
  AgentTemplate,
  AgentLifecycle
} from '../../types/evolution.types.js';

class AgentFactoryService {
  private dynamicAgents: Map<string, DynamicAgentSpec> = new Map();
  private agentLifecycles: Map<string, AgentLifecycle> = new Map();
  private templates: Map<string, AgentTemplate> = new Map();
  private creationHistory: Array<{ timestamp: Date; agentId: string; reason: string }> = [];

  async initialize(): Promise<void> {
    logger.info('[AgentFactory] Initializing...');

    // Initialize agent templates
    await this.initializeTemplates();

    // Clean up expired temporary agents
    this.startCleanupInterval();

    logger.info('[AgentFactory] Initialized successfully');
  }

  /**
   * Create a new dynamic agent
   */
  async createAgent(spec: Omit<DynamicAgentSpec, 'id' | 'createdAt'>): Promise<DynamicAgentSpec> {
    logger.info('[AgentFactory] Creating dynamic agent', {
      name: spec.name,
      type: spec.type,
      temporary: spec.temporary
    });

    // Generate unique ID
    const agentId = this.generateAgentId(spec.name);

    // Create full spec
    const fullSpec: DynamicAgentSpec = {
      ...spec,
      id: agentId,
      createdAt: new Date()
    };

    // Store agent
    this.dynamicAgents.set(agentId, fullSpec);

    // Initialize lifecycle
    const lifecycle: AgentLifecycle = {
      agentId,
      status: 'created',
      createdAt: new Date(),
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      performanceScore: 0
    };
    this.agentLifecycles.set(agentId, lifecycle);

    // Record creation
    this.creationHistory.push({
      timestamp: new Date(),
      agentId,
      reason: spec.creationReason
    });

    logger.info('[AgentFactory] Dynamic agent created', {
      agentId,
      name: spec.name
    });

    return fullSpec;
  }

  /**
   * Generate agent specification from pattern
   */
  async generateAgentSpec(pattern: {
    name: string;
    category: string;
    frequency: number;
    context: Record<string, any>;
  }): Promise<Omit<DynamicAgentSpec, 'id' | 'createdAt'>> {
    logger.info('[AgentFactory] Generating agent spec from pattern', {
      pattern: pattern.name
    });

    // Find matching template
    const template = this.findMatchingTemplate(pattern);

    // Determine specialization
    const specialization = this.determineSpecialization(pattern);

    // Generate capabilities
    const capabilities = this.generateCapabilities(pattern, template);

    // Generate triggers
    const triggers = this.generateTriggers(pattern);

    // Generate constraints
    const constraints = this.generateConstraints(pattern);

    const spec: Omit<DynamicAgentSpec, 'id' | 'createdAt'> = {
      name: this.generateAgentName(pattern),
      type: `${pattern.category}_specialist`,
      baseAgentType: template?.baseAgentType || AgentType.RECOVERY,
      specialization,
      authority: AuthorityLevel.EXECUTE_SAFE,
      capabilities,
      triggers,
      constraints,
      temporary: pattern.frequency < 10, // Temporary if infrequent
      expiresAt: pattern.frequency < 10 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
      createdBy: 'meta_learning',
      creationReason: `Pattern detected: ${pattern.name} (frequency: ${pattern.frequency})`
    };

    logger.info('[AgentFactory] Agent spec generated', {
      name: spec.name,
      specialization: spec.specialization
    });

    return spec;
  }

  /**
   * Remove dynamic agent
   */
  async removeAgent(agentId: string, reason: string = 'Manual removal'): Promise<boolean> {
    logger.info('[AgentFactory] Removing agent', { agentId, reason });

    const agent = this.dynamicAgents.get(agentId);
    if (!agent) {
      logger.warn('[AgentFactory] Agent not found', { agentId });
      return false;
    }

    // Update lifecycle
    const lifecycle = this.agentLifecycles.get(agentId);
    if (lifecycle) {
      lifecycle.status = 'removed';
      lifecycle.removedAt = new Date();
      lifecycle.removalReason = reason;
      this.agentLifecycles.set(agentId, lifecycle);
    }

    // Remove agent
    this.dynamicAgents.delete(agentId);

    logger.info('[AgentFactory] Agent removed', { agentId });

    return true;
  }

  /**
   * Activate agent
   */
  async activateAgent(agentId: string): Promise<boolean> {
    logger.info('[AgentFactory] Activating agent', { agentId });

    const lifecycle = this.agentLifecycles.get(agentId);
    if (!lifecycle) {
      logger.warn('[AgentFactory] Agent lifecycle not found', { agentId });
      return false;
    }

    lifecycle.status = 'active';
    lifecycle.activatedAt = new Date();
    this.agentLifecycles.set(agentId, lifecycle);

    logger.info('[AgentFactory] Agent activated', { agentId });

    return true;
  }

  /**
   * Suspend agent
   */
  async suspendAgent(agentId: string, reason: string): Promise<boolean> {
    logger.info('[AgentFactory] Suspending agent', { agentId, reason });

    const lifecycle = this.agentLifecycles.get(agentId);
    if (!lifecycle) {
      logger.warn('[AgentFactory] Agent lifecycle not found', { agentId });
      return false;
    }

    lifecycle.status = 'suspended';
    lifecycle.suspendedAt = new Date();
    this.agentLifecycles.set(agentId, lifecycle);

    logger.info('[AgentFactory] Agent suspended', { agentId });

    return true;
  }

  /**
   * Record agent execution
   */
  async recordExecution(agentId: string, success: boolean): Promise<void> {
    const lifecycle = this.agentLifecycles.get(agentId);
    if (!lifecycle) return;

    lifecycle.totalExecutions++;
    if (success) {
      lifecycle.successfulExecutions++;
    } else {
      lifecycle.failedExecutions++;
    }

    // Update performance score
    lifecycle.performanceScore = lifecycle.totalExecutions > 0
      ? (lifecycle.successfulExecutions / lifecycle.totalExecutions) * 100
      : 0;

    this.agentLifecycles.set(agentId, lifecycle);
  }

  /**
   * Get dynamic agents
   */
  getDynamicAgents(): DynamicAgentSpec[] {
    return Array.from(this.dynamicAgents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): DynamicAgentSpec | null {
    return this.dynamicAgents.get(agentId) || null;
  }

  /**
   * Get agent lifecycle
   */
  getAgentLifecycle(agentId: string): AgentLifecycle | null {
    return this.agentLifecycles.get(agentId) || null;
  }

  /**
   * Get templates
   */
  getTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get creation statistics
   */
  getCreationStats(): {
    totalCreated: number;
    activeAgents: number;
    temporaryAgents: number;
    recentCreations: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    return {
      totalCreated: this.creationHistory.length,
      activeAgents: Array.from(this.agentLifecycles.values()).filter(
        l => l.status === 'active'
      ).length,
      temporaryAgents: Array.from(this.dynamicAgents.values()).filter(
        a => a.temporary
      ).length,
      recentCreations: this.creationHistory.filter(
        h => h.timestamp.getTime() > oneHourAgo
      ).length
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async initializeTemplates(): Promise<void> {
    // Database Retry Specialist Template
    this.templates.set('database_retry', {
      templateId: 'database_retry',
      name: 'Database Retry Specialist',
      description: 'Specialized agent for handling database connection failures and retries',
      baseAgentType: AgentType.RECOVERY,
      defaultAuthority: AuthorityLevel.EXECUTE_SAFE,
      configurableParameters: ['maxRetries', 'backoffMultiplier', 'timeout'],
      useCases: ['database_connection_failure', 'query_timeout', 'deadlock'],
      successRate: 0,
      usageCount: 0
    });

    // API Timeout Handler Template
    this.templates.set('api_timeout', {
      templateId: 'api_timeout',
      name: 'API Timeout Handler',
      description: 'Specialized agent for handling API timeouts and circuit breaking',
      baseAgentType: AgentType.RECOVERY,
      defaultAuthority: AuthorityLevel.EXECUTE_SAFE,
      configurableParameters: ['timeout', 'circuitBreakerThreshold', 'fallbackStrategy'],
      useCases: ['api_timeout', 'slow_response', 'service_unavailable'],
      successRate: 0,
      usageCount: 0
    });

    // Performance Optimizer Template
    this.templates.set('performance_optimizer', {
      templateId: 'performance_optimizer',
      name: 'Performance Optimizer',
      description: 'Specialized agent for identifying and fixing performance bottlenecks',
      baseAgentType: AgentType.OPTIMIZATION,
      defaultAuthority: AuthorityLevel.SUGGEST,
      configurableParameters: ['thresholds', 'optimizationStrategies', 'monitoringInterval'],
      useCases: ['slow_query', 'high_memory_usage', 'cpu_spike'],
      successRate: 0,
      usageCount: 0
    });

    logger.debug('[AgentFactory] Templates initialized', {
      count: this.templates.size
    });
  }

  private findMatchingTemplate(pattern: any): AgentTemplate | null {
    // Match pattern to template based on category and context
    const category = pattern.category.toLowerCase();

    if (category.includes('database') || category.includes('retry')) {
      return this.templates.get('database_retry') || null;
    }

    if (category.includes('api') || category.includes('timeout')) {
      return this.templates.get('api_timeout') || null;
    }

    if (category.includes('performance') || category.includes('optimization')) {
      return this.templates.get('performance_optimizer') || null;
    }

    return null;
  }

  private determineSpecialization(pattern: any): string {
    // Extract specialization from pattern
    const context = pattern.context || {};
    
    if (context.errorType) {
      return context.errorType;
    }

    if (context.component) {
      return `${context.component}_specialist`;
    }

    return pattern.category;
  }

  private generateCapabilities(pattern: any, template: AgentTemplate | null): string[] {
    const capabilities: string[] = [];

    if (template) {
      // Add template-based capabilities
      template.useCases.forEach(useCase => {
        capabilities.push(`handle_${useCase}`);
      });
    }

    // Add pattern-specific capabilities
    if (pattern.context?.actions) {
      capabilities.push(...pattern.context.actions);
    }

    return capabilities;
  }

  private generateTriggers(pattern: any): AgentTrigger[] {
    const triggers: AgentTrigger[] = [];

    // Pattern-based trigger
    triggers.push({
      type: 'pattern',
      condition: pattern.name,
      parameters: {
        minFrequency: Math.max(pattern.frequency * 0.5, 1),
        context: pattern.context
      }
    });

    // Threshold-based trigger if applicable
    if (pattern.context?.threshold) {
      triggers.push({
        type: 'threshold',
        condition: `metric > ${pattern.context.threshold}`,
        parameters: {
          metric: pattern.context.metric,
          threshold: pattern.context.threshold
        }
      });
    }

    return triggers;
  }

  private generateConstraints(pattern: any): AgentConstraints {
    return {
      maxExecutionsPerHour: pattern.frequency < 10 ? 10 : 50,
      maxResourceUsage: {
        memory: 100, // MB
        cpu: 10 // percentage
      },
      allowedActions: this.generateAllowedActions(pattern),
      requiredApprovals: pattern.category === 'critical' ? ['human'] : []
    };
  }

  private generateAllowedActions(pattern: any): string[] {
    const actions: string[] = [];

    // Based on pattern category
    if (pattern.category.includes('recovery')) {
      actions.push('retry', 'restart', 'fallback');
    }

    if (pattern.category.includes('optimization')) {
      actions.push('optimize', 'cache', 'scale');
    }

    if (pattern.category.includes('monitoring')) {
      actions.push('alert', 'log', 'report');
    }

    return actions;
  }

  private generateAgentName(pattern: any): string {
    const category = pattern.category.replace(/_/g, ' ');
    const words = category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return `${words.join('')}Agent`;
  }

  private generateAgentId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `agent_${name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}_${random}`;
  }

  private startCleanupInterval(): void {
    // Clean up expired temporary agents every hour
    setInterval(() => {
      this.cleanupExpiredAgents();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredAgents(): void {
    const now = new Date();
    let removed = 0;

    for (const [agentId, agent] of this.dynamicAgents.entries()) {
      if (agent.temporary && agent.expiresAt && agent.expiresAt < now) {
        this.removeAgent(agentId, 'Expired');
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('[AgentFactory] Cleaned up expired agents', { count: removed });
    }
  }
}

export const agentFactoryService = new AgentFactoryService();
export default agentFactoryService;
