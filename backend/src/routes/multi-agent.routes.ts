// Multi-Agent Routes - Phase 20

import { Router } from 'express';
import * as multiAgentController from '../controllers/multi-agent.controller.js';

const router = Router();

/**
 * POST /api/multi-agent/initialize
 * Initialize the multi-agent system
 */
router.post('/initialize', multiAgentController.initializeSystem);

/**
 * GET /api/multi-agent/stats
 * Get system statistics
 */
router.get('/stats', multiAgentController.getSystemStats);

/**
 * GET /api/multi-agent/agents/status
 * Get all agent statuses
 */
router.get('/agents/status', multiAgentController.getAgentStatuses);

/**
 * POST /api/multi-agent/query
 * Handle user query
 * Body: { query: string, userId: string, sessionId?: string }
 */
router.post('/query', multiAgentController.handleQuery);

/**
 * GET /api/multi-agent/alerts
 * Get pending alerts
 */
router.get('/alerts', multiAgentController.getPendingAlerts);

/**
 * GET /api/multi-agent/messages
 * Get message history
 * Query: ?limit=100
 */
router.get('/messages', multiAgentController.getMessageHistory);

/**
 * GET /api/multi-agent/state
 * Get shared state
 */
router.get('/state', multiAgentController.getSharedState);

/**
 * POST /api/multi-agent/shutdown
 * Shutdown the multi-agent system
 */
router.post('/shutdown', multiAgentController.shutdownSystem);

export default router;
