// Evolution Controller - Phase 21
// API endpoints for self-evolving agent system

import { Request, Response } from 'express';
import logger from '../config/logger.js';
import { asyncHandler } from '../handlers/async.handler.js';
import evolutionOrchestratorService from '../services/evolution/evolution-orchestrator.service.js';
import agentEvolutionService from '../services/evolution/agent-evolution.service.js';
import agentFactoryService from '../services/evolution/agent-factory.service.js';
import metaLearningService from '../services/evolution/meta-learning.service.js';
import architectureOptimizerService from '../services/evolution/architecture-optimizer.service.js';
import safetyControllerService from '../services/evolution/safety-controller.service.js';
import selfOptimizationService from '../services/evolution/self-optimization.service.js';
import { AgentType } from '../types/agent.types.js';

/**
 * Initialize evolution system
 */
export const initializeEvolution = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[EvolutionController] Initialize evolution system');

  await evolutionOrchestratorService.initialize();

  res.json({
    success: true,
    message: 'Evolution system initialized',
    status: evolutionOrchestratorService.getStatus()
  });
});

/**
 * Get evolution status
 */
export const getEvolutionStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = evolutionOrchestratorService.getStatus();

  res.json({
    success: true,
    status
  });
});

/**
 * Run optimization cycle
 */
export const runOptimizationCycle = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[EvolutionController] Running optimization cycle');

  const result = await evolutionOrchestratorService.runOptimizationCycle();

  res.json({
    success: true,
    result
  });
});

/**
 * Get evolution metrics
 */
export const getEvolutionMetrics = asyncHandler(async (req: Request, res: Response) => {
  const metrics = evolutionOrchestratorService.getMetrics();

  res.json({
    success: true,
    metrics
  });
});

/**
 * Get agent performance
 */
export const getAgentPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { agentType } = req.params;

  if (!Object.values(AgentType).includes(agentType as AgentType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid agent type'
    });
  }

  const performance = agentEvolutionService.getAgentPerformance(agentType as AgentType);

  res.json({
    success: true,
    performance
  });
});

/**
 * Optimize specific agent
 */
export const optimizeAgent = asyncHandler(async (req: Request, res: Response) => {
  const { agentType } = req.params;

  if (!Object.values(AgentType).includes(agentType as AgentType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid agent type'
    });
  }

  logger.info('[EvolutionController] Optimizing agent', { agentType });

  const optimization = await agentEvolutionService.optimizeAgent(agentType as AgentType);

  if (!optimization) {
    return res.json({
      success: true,
      message: 'No optimization needed',
      optimization: null
    });
  }

  // Apply optimization if confidence is high
  if (optimization.confidence > 70) {
    await agentEvolutionService.applyOptimization(optimization);
  }

  res.json({
    success: true,
    optimization
  });
});

/**
 * Get agent strategies
 */
export const getAgentStrategies = asyncHandler(async (req: Request, res: Response) => {
  const { agentType } = req.params;

  if (!Object.values(AgentType).includes(agentType as AgentType)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid agent type'
    });
  }

  const strategies = agentEvolutionService.getAgentStrategies(agentType as AgentType);

  res.json({
    success: true,
    strategies
  });
});

/**
 * Create dynamic agent
 */
export const createDynamicAgent = asyncHandler(async (req: Request, res: Response) => {
  const spec = req.body;

  logger.info('[EvolutionController] Creating dynamic agent', { name: spec.name });

  // Check if creation is allowed
  const allowed = await safetyControllerService.checkEvolutionAllowed({
    type: 'create_agent',
    target: spec.name,
    parameters: spec,
    requestedBy: 'user'
  });

  if (!allowed.allowed) {
    return res.status(403).json({
      success: false,
      error: allowed.reason || 'Agent creation not allowed'
    });
  }

  if (allowed.requiresApproval) {
    return res.json({
      success: true,
      requiresApproval: true,
      message: 'Agent creation requires approval'
    });
  }

  const agent = await agentFactoryService.createAgent(spec);

  res.json({
    success: true,
    agent
  });
});

/**
 * Get dynamic agents
 */
export const getDynamicAgents = asyncHandler(async (req: Request, res: Response) => {
  const agents = agentFactoryService.getDynamicAgents();

  res.json({
    success: true,
    agents
  });
});

/**
 * Remove dynamic agent
 */
export const removeDynamicAgent = asyncHandler(async (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { reason } = req.body;

  logger.info('[EvolutionController] Removing dynamic agent', { agentId });

  const removed = await agentFactoryService.removeAgent(agentId, reason || 'Manual removal');

  if (!removed) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }

  res.json({
    success: true,
    message: 'Agent removed'
  });
});

/**
 * Get agent lifecycle
 */
export const getAgentLifecycle = asyncHandler(async (req: Request, res: Response) => {
  const { agentId } = req.params;

  const lifecycle = agentFactoryService.getAgentLifecycle(agentId);

  if (!lifecycle) {
    return res.status(404).json({
      success: false,
      error: 'Agent lifecycle not found'
    });
  }

  res.json({
    success: true,
    lifecycle
  });
});

/**
 * Get detected patterns
 */
export const getPatterns = asyncHandler(async (req: Request, res: Response) => {
  const patterns = metaLearningService.getPatterns();

  res.json({
    success: true,
    patterns
  });
});

/**
 * Get meta-learning insights
 */
export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const insights = metaLearningService.getInsights();

  res.json({
    success: true,
    insights
  });
});

/**
 * Get best practices
 */
export const getBestPractices = asyncHandler(async (req: Request, res: Response) => {
  const bestPractices = metaLearningService.getBestPractices();

  res.json({
    success: true,
    bestPractices
  });
});

/**
 * Get architecture evaluation
 */
export const getArchitectureEvaluation = asyncHandler(async (req: Request, res: Response) => {
  const evaluation = await architectureOptimizerService.evaluateArchitecture();

  res.json({
    success: true,
    evaluation
  });
});

/**
 * Get safety status
 */
export const getSafetyStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = safetyControllerService.getSafetyStatus();

  res.json({
    success: true,
    status
  });
});

/**
 * Create checkpoint
 */
export const createCheckpoint = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;

  logger.info('[EvolutionController] Creating checkpoint', { reason });

  const checkpoint = await safetyControllerService.createCheckpoint('user', reason || 'Manual checkpoint');

  res.json({
    success: true,
    checkpoint
  });
});

/**
 * Rollback to checkpoint
 */
export const rollbackToCheckpoint = asyncHandler(async (req: Request, res: Response) => {
  const { checkpointId } = req.body;

  logger.info('[EvolutionController] Rolling back to checkpoint', { checkpointId });

  const success = await safetyControllerService.rollback(checkpointId);

  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Checkpoint not found or rollback failed'
    });
  }

  res.json({
    success: true,
    message: 'Rollback successful'
  });
});

/**
 * Get audit log
 */
export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  const auditLog = safetyControllerService.getAuditLog(limit);

  res.json({
    success: true,
    auditLog
  });
});

/**
 * Get optimization baselines
 */
export const getOptimizationBaselines = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;

  const baselines = selfOptimizationService.getBaselines(limit);

  res.json({
    success: true,
    baselines
  });
});

/**
 * Get optimization strategies
 */
export const getOptimizationStrategies = asyncHandler(async (req: Request, res: Response) => {
  const strategies = selfOptimizationService.getStrategies();

  res.json({
    success: true,
    strategies
  });
});
