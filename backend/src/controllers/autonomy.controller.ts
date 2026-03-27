import { Request, Response } from 'express';
import { autonomyService } from '@/services/workflow/autonomy.service.js';
import { actionExecutorService } from '@/services/workflow/action-executor.service.js';
import { policyEngineService } from '@/services/infrastructure/policy-engine.service.js';
import { learningService } from '@/services/ai/learning.service.js';
import { AutonomyLevel } from '@/types/autonomy.types.js';
import logger from '@/config/logger.js';

/**
 * Configure user autonomy settings
 */
export const configureAutonomy = async (req: Request, res: Response) => {
  try {
    const { userId, level, config } = req.body;

    if (!userId || !level) {
      return res.status(400).json({
        error: 'userId and level are required'
      });
    }

    // Validate level
    if (!Object.values(AutonomyLevel).includes(level)) {
      return res.status(400).json({
        error: 'Invalid autonomy level'
      });
    }

    // Update autonomy level
    const updatedConfig = autonomyService.updateAutonomyLevel(userId, level);

    // Apply additional config if provided
    if (config) {
      autonomyService.updateConfig(userId, config);
    }

    res.json({
      success: true,
      config: updatedConfig
    });

  } catch (error: any) {
    logger.error('Configure autonomy error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user autonomy configuration
 */
export const getAutonomyConfig = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const config = autonomyService.getConfig(userId as string);

    if (!config) {
      return res.status(404).json({
        error: 'User autonomy not configured'
      });
    }

    res.json({ config });

  } catch (error: any) {
    logger.error('Get autonomy config error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get autonomous actions history
 */
export const getActions = async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const actions = actionExecutorService.getHistory(Number(limit));

    res.json({ actions });

  } catch (error: any) {
    logger.error('Get actions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Approve pending action
 */
export const approveAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const execution = await actionExecutorService.approveAction(id as string);

    res.json({
      success: true,
      execution
    });

  } catch (error: any) {
    logger.error('Approve action error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Undo executed action
 */
export const undoAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await actionExecutorService.undoAction(id as string);

    res.json({
      success: true,
      message: 'Action undone successfully'
    });

  } catch (error: any) {
    logger.error('Undo action error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get decision and action logs
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    const status = autonomyService.getSystemStatus();

    res.json({
      decisions: status.decisionHistory,
      executions: status.executionHistory,
      policies: status.policies,
      timestamp: status.timestamp
    });

  } catch (error: any) {
    logger.error('Get logs error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get policies
 */
export const getPolicies = async (req: Request, res: Response) => {
  try {
    const policies = policyEngineService.getPolicies();

    res.json({ policies });

  } catch (error: any) {
    logger.error('Get policies error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Toggle policy
 */
export const togglePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const success = policyEngineService.togglePolicy(id as string, enabled);

    if (!success) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({
      success: true,
      message: `Policy ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error: any) {
    logger.error('Toggle policy error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get learning insights
 */
export const getLearningInsights = async (req: Request, res: Response) => {
  try {
    const insights = learningService.getInsights();

    res.json({ insights });

  } catch (error: any) {
    logger.error('Get learning insights error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get autonomy recommendations
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const recommendations = autonomyService.getRecommendations(userId as string);

    res.json({ recommendations });

  } catch (error: any) {
    logger.error('Get recommendations error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Emergency stop
 */
export const emergencyStop = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    autonomyService.emergencyStop(userId);

    res.json({
      success: true,
      message: 'All automation disabled'
    });

  } catch (error: any) {
    logger.error('Emergency stop error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};
