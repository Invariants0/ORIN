// Evolution Routes - Phase 21

import { Router } from 'express';
import * as evolutionController from '../controllers/evolution.controller.js';

const router = Router();

// Evolution Management
router.post('/initialize', evolutionController.initializeEvolution);
router.get('/status', evolutionController.getEvolutionStatus);
router.post('/optimize', evolutionController.runOptimizationCycle);
router.get('/metrics', evolutionController.getEvolutionMetrics);

// Agent Evolution
router.get('/agents/:agentType/performance', evolutionController.getAgentPerformance);
router.post('/agents/:agentType/optimize', evolutionController.optimizeAgent);
router.get('/agents/:agentType/strategies', evolutionController.getAgentStrategies);

// Dynamic Agents
router.post('/agents/create', evolutionController.createDynamicAgent);
router.get('/agents/dynamic', evolutionController.getDynamicAgents);
router.delete('/agents/:agentId', evolutionController.removeDynamicAgent);
router.get('/agents/:agentId/lifecycle', evolutionController.getAgentLifecycle);

// Meta-Learning
router.get('/meta/patterns', evolutionController.getPatterns);
router.get('/meta/insights', evolutionController.getInsights);
router.get('/meta/best-practices', evolutionController.getBestPractices);

// Architecture
router.get('/architecture/evaluation', evolutionController.getArchitectureEvaluation);

// Safety & Control
router.get('/safety/status', evolutionController.getSafetyStatus);
router.post('/safety/checkpoint', evolutionController.createCheckpoint);
router.post('/safety/rollback', evolutionController.rollbackToCheckpoint);
router.get('/safety/audit', evolutionController.getAuditLog);

// Self-Optimization
router.get('/optimization/baselines', evolutionController.getOptimizationBaselines);
router.get('/optimization/strategies', evolutionController.getOptimizationStrategies);

export default router;
