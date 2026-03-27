import { Router } from 'express';
import * as autonomyController from '@/controllers/autonomy.controller.js';
import { asyncHandler } from '@/handlers/async.handler.js';

const router = Router();

// Configuration
router.post('/configure', asyncHandler(autonomyController.configureAutonomy));
router.get('/config/:userId', asyncHandler(autonomyController.getAutonomyConfig));

// Actions
router.get('/actions', asyncHandler(autonomyController.getActions));
router.post('/approve/:id', asyncHandler(autonomyController.approveAction));
router.post('/undo/:id', asyncHandler(autonomyController.undoAction));

// Logs
router.get('/logs', asyncHandler(autonomyController.getLogs));

// Policies
router.get('/policies', asyncHandler(autonomyController.getPolicies));
router.post('/policies/:id/toggle', asyncHandler(autonomyController.togglePolicy));

// Learning
router.get('/insights', asyncHandler(autonomyController.getLearningInsights));
router.get('/recommendations/:userId', asyncHandler(autonomyController.getRecommendations));

// Emergency
router.post('/emergency-stop', asyncHandler(autonomyController.emergencyStop));

export default router;
