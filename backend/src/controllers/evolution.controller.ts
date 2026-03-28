import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '@/config/logger.js';
import catchAsync from '@/handlers/async.handler.js';
import { sendSuccess } from '@/utils/response.js';
import { APIError } from '@/utils/errors.js';
import evolutionOrchestratorService from '@/services/evolution/evolution-orchestrator.service.js';
import agentEvolutionService from '@/services/evolution/agent-evolution.service.js';
import agentFactoryService from '@/services/evolution/agent-factory.service.js';
import metaLearningService from '@/services/evolution/meta-learning.service.js';
import architectureOptimizerService from '@/services/evolution/architecture-optimizer.service.js';
import safetyControllerService from '@/services/evolution/safety-controller.service.js';
import selfOptimizationService from '@/services/evolution/self-optimization.service.js';
import { AgentType, AuthorityLevel } from '@/types/agent.types.js';

const agentTypeSchema = z.nativeEnum(AgentType);
const createAgentSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(AgentType),
  parameters: z.record(z.any()).optional()
});

class EvolutionController {
  /**
   * Initialize evolution system
   */
  initializeEvolution = catchAsync(async (req: Request, res: Response) => {
    logger.info('[EvolutionController] Initialize evolution system');
    await evolutionOrchestratorService.initialize();
    sendSuccess(res, { status: evolutionOrchestratorService.getStatus() }, 'Evolution system initialized');
  });

  /**
   * Get evolution status
   */
  getEvolutionStatus = catchAsync(async (req: Request, res: Response) => {
    const status = evolutionOrchestratorService.getStatus();
    sendSuccess(res, { status });
  });

  /**
   * Run optimization cycle
   */
  runOptimizationCycle = catchAsync(async (req: Request, res: Response) => {
    logger.info('[EvolutionController] Running optimization cycle');
    const result = await evolutionOrchestratorService.runOptimizationCycle();
    sendSuccess(res, { result });
  });

  /**
   * Get evolution metrics
   */
  getEvolutionMetrics = catchAsync(async (req: Request, res: Response) => {
    const metrics = evolutionOrchestratorService.getMetrics();
    sendSuccess(res, { metrics });
  });

  /**
   * Get agent performance
   */
  getAgentPerformance = catchAsync(async (req: Request, res: Response) => {
    const parsed = agentTypeSchema.safeParse(req.params.agentType);
    if (!parsed.success) throw APIError.badRequest("Invalid agent type");

    const performance = agentEvolutionService.getAgentPerformance(parsed.data);
    sendSuccess(res, { performance });
  });

  /**
   * Optimize specific agent
   */
  optimizeAgent = catchAsync(async (req: Request, res: Response) => {
    const parsed = agentTypeSchema.safeParse(req.params.agentType);
    if (!parsed.success) throw APIError.badRequest("Invalid agent type");

    logger.info('[EvolutionController] Optimizing agent', { agentType: parsed.data });
    const optimization = await agentEvolutionService.optimizeAgent(parsed.data);

    if (!optimization) {
      return sendSuccess(res, { optimization: null }, 'No optimization needed');
    }

    if (optimization.confidence > 70) {
      await agentEvolutionService.applyOptimization(optimization);
    }

    sendSuccess(res, { optimization });
  });

  /**
   * Get agent strategies
   */
  getAgentStrategies = catchAsync(async (req: Request, res: Response) => {
    const parsed = agentTypeSchema.safeParse(req.params.agentType);
    if (!parsed.success) throw APIError.badRequest("Invalid agent type");

    const strategies = agentEvolutionService.getAgentStrategies(parsed.data);
    sendSuccess(res, { strategies });
  });

  /**
   * Create dynamic agent
   */
  createDynamicAgent = catchAsync(async (req: Request, res: Response) => {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) throw APIError.badRequest("Invalid agent specification");

    const agentProps = parsed.data;
    logger.info('[EvolutionController] Creating dynamic agent', { name: agentProps.name });

    // Build the full specification with defaults to satisfy type requirements
    const spec = {
      name: agentProps.name,
      type: agentProps.type + '_custom',
      baseAgentType: agentProps.type,
      specialization: 'Custom user-defined agent',
      authority: AuthorityLevel.SUGGEST,
      capabilities: [],
      triggers: [],
      constraints: {
        maxExecutionsPerHour: 5,
        maxResourceUsage: { memory: 128, cpu: 10 },
        allowedActions: [],
        requiredApprovals: []
      },
      temporary: true,
      createdBy: 'user' as const,
      creationReason: 'Manual user creation via API',
      parameters: agentProps.parameters || {}
    };

    const allowed = await safetyControllerService.checkEvolutionAllowed({
      type: 'create_agent',
      target: spec.name,
      parameters: spec,
      requestedBy: 'user'
    });

    if (!allowed.allowed) throw APIError.forbidden(allowed.reason || 'Agent creation not allowed');
    if (allowed.requiresApproval) {
      return sendSuccess(res, { requiresApproval: true }, 'Agent creation requires approval');
    }

    const agent = await agentFactoryService.createAgent(spec);
    sendSuccess(res, { agent }, 'Agent created successfully');
  });

  /**
   * Get dynamic agents
   */
  getDynamicAgents = catchAsync(async (req: Request, res: Response) => {
    const agents = agentFactoryService.getDynamicAgents();
    sendSuccess(res, { agents });
  });

  /**
   * Remove dynamic agent
   */
  removeDynamicAgent = catchAsync(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const { reason } = req.body;

    logger.info('[EvolutionController] Removing dynamic agent', { agentId });
    const removed = await agentFactoryService.removeAgent(agentId as string, reason || 'Manual removal');

    if (!removed) throw APIError.notFound('Agent not found');
    sendSuccess(res, null, 'Agent removed');
  });

  /**
   * Get agent lifecycle
   */
  getAgentLifecycle = catchAsync(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const lifecycle = agentFactoryService.getAgentLifecycle(agentId as string);

    if (!lifecycle) throw APIError.notFound('Agent lifecycle not found');
    sendSuccess(res, { lifecycle });
  });

  /**
   * Get detected patterns
   */
  getPatterns = catchAsync(async (req: Request, res: Response) => {
    const patterns = metaLearningService.getPatterns();
    sendSuccess(res, { patterns });
  });

  /**
   * Get meta-learning insights
   */
  getInsights = catchAsync(async (req: Request, res: Response) => {
    const insights = metaLearningService.getInsights();
    sendSuccess(res, { insights });
  });

  /**
   * Get best practices
   */
  getBestPractices = catchAsync(async (req: Request, res: Response) => {
    const bestPractices = metaLearningService.getBestPractices();
    sendSuccess(res, { bestPractices });
  });

  /**
   * Get architecture evaluation
   */
  getArchitectureEvaluation = catchAsync(async (req: Request, res: Response) => {
    const evaluation = await architectureOptimizerService.evaluateArchitecture();
    sendSuccess(res, { evaluation });
  });

  /**
   * Get safety status
   */
  getSafetyStatus = catchAsync(async (req: Request, res: Response) => {
    const status = safetyControllerService.getSafetyStatus();
    sendSuccess(res, { status });
  });

  /**
   * Create checkpoint
   */
  createCheckpoint = catchAsync(async (req: Request, res: Response) => {
    const { reason } = req.body;
    logger.info('[EvolutionController] Creating checkpoint', { reason });
    const checkpoint = await safetyControllerService.createCheckpoint('user', reason || 'Manual checkpoint');
    sendSuccess(res, { checkpoint });
  });

  /**
   * Rollback to checkpoint
   */
  rollbackToCheckpoint = catchAsync(async (req: Request, res: Response) => {
    const { checkpointId } = req.body;
    logger.info('[EvolutionController] Rolling back to checkpoint', { checkpointId });
    const success = await safetyControllerService.rollback(checkpointId);

    if (!success) throw APIError.notFound('Checkpoint not found or rollback failed');
    sendSuccess(res, null, 'Rollback successful');
  });

  /**
   * Get audit log
   */
  getAuditLog = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const auditLog = safetyControllerService.getAuditLog(limit);
    sendSuccess(res, { auditLog });
  });

  /**
   * Get optimization baselines
   */
  getOptimizationBaselines = catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const baselines = selfOptimizationService.getBaselines(limit);
    sendSuccess(res, { baselines });
  });

  /**
   * Get optimization strategies
   */
  getOptimizationStrategies = catchAsync(async (req: Request, res: Response) => {
    const strategies = selfOptimizationService.getStrategies();
    sendSuccess(res, { strategies });
  });
}

export const evolutionController = new EvolutionController();
