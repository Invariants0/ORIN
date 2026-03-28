// Multi-Agent Routes - Phase 20

import { Router } from 'express';
import { multiAgentController } from '@/controllers/multi-agent.controller.js';
import { authenticate } from '@/middlewares/auth.middleware.js';

const router = Router();

// Apply authentication to all multi-agent routes
router.use(authenticate);

/**
 * @route   POST /api/multi-agent/initialize
 * @desc    Initialize the multi-agent system
 */
router.post('/initialize', multiAgentController.initializeSystem);

/**
 * @route   GET /api/multi-agent/stats
 * @desc    Get system statistics
 */
router.get('/stats', multiAgentController.getSystemStats);

/**
 * @route   GET /api/multi-agent/agents/status
 * @desc    Get all agent statuses
 */
router.get('/agents/status', multiAgentController.getAgentStatuses);

/**
 * @route   POST /api/multi-agent/query
 * @desc    Handle user query (requires { query: string, sessionId?: string })
 */
router.post('/query', multiAgentController.handleQuery);

/**
 * @route   GET /api/multi-agent/alerts
 * @desc    Get pending alerts
 */
router.get('/alerts', multiAgentController.getPendingAlerts);

/**
 * @route   GET /api/multi-agent/messages
 * @desc    Get message history
 */
router.get('/messages', multiAgentController.getMessageHistory);

/**
 * @route   GET /api/multi-agent/state
 * @desc    Get shared state
 */
router.get('/state', multiAgentController.getSharedState);

/**
 * @route   POST /api/multi-agent/shutdown
 * @desc    Shutdown the multi-agent system
 */
router.post('/shutdown', multiAgentController.shutdownSystem);

export default router;
