// Multi-Agent Controller - Phase 20

import { Request, Response } from 'express';
import multiAgentOrchestratorService from '../services/multi-agent-orchestrator.service.js';
import logger from '../config/logger.js';

/**
 * Initialize multi-agent system
 */
export async function initializeSystem(req: Request, res: Response) {
  try {
    logger.info('[MultiAgentController] Initialize request received');

    await multiAgentOrchestratorService.initialize();

    res.json({
      success: true,
      message: 'Multi-agent system initialized successfully',
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Initialize failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats(req: Request, res: Response) {
  try {
    const stats = multiAgentOrchestratorService.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Get stats failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get agent statuses
 */
export async function getAgentStatuses(req: Request, res: Response) {
  try {
    const statuses = multiAgentOrchestratorService.getAllAgentStatuses();

    res.json({
      success: true,
      statuses,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Get agent statuses failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle user query
 */
export async function handleQuery(req: Request, res: Response) {
  try {
    const { query, userId, sessionId } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      });
    }

    logger.info('[MultiAgentController] Query received', { query, userId });

    const result = await multiAgentOrchestratorService.handleUserQuery(
      query,
      userId,
      sessionId
    );

    res.json({
      success: true,
      result,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Query handling failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get pending alerts
 */
export async function getPendingAlerts(req: Request, res: Response) {
  try {
    const alerts = multiAgentOrchestratorService.getPendingAlerts();

    res.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Get alerts failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get message history
 */
export async function getMessageHistory(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const messages = multiAgentOrchestratorService.getMessageHistory(limit);

    res.json({
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Get message history failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get shared state
 */
export async function getSharedState(req: Request, res: Response) {
  try {
    const state = multiAgentOrchestratorService.getSharedState();

    res.json({
      success: true,
      state,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Get shared state failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Shutdown system
 */
export async function shutdownSystem(req: Request, res: Response) {
  try {
    logger.info('[MultiAgentController] Shutdown request received');

    await multiAgentOrchestratorService.shutdown();

    res.json({
      success: true,
      message: 'Multi-agent system shut down successfully',
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('[MultiAgentController] Shutdown failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
