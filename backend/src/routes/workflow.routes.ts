import { Router } from 'express';
import { workflowController } from '@/controllers/workflow.controller.js';
import { asyncHandler } from '@/handlers/async.handler.js';

const router = Router();

// Workflow CRUD
router.get('/', asyncHandler(workflowController.getWorkflows.bind(workflowController)));
router.get('/statistics', asyncHandler(workflowController.getStatistics.bind(workflowController)));
router.get('/metrics', asyncHandler(workflowController.getMetrics.bind(workflowController)));
router.get('/alerts', asyncHandler(workflowController.getAlerts.bind(workflowController)));
router.delete('/alerts', asyncHandler(workflowController.clearAlerts.bind(workflowController)));
router.get('/:id', asyncHandler(workflowController.getWorkflowById.bind(workflowController)));
router.post('/', asyncHandler(workflowController.createWorkflow.bind(workflowController)));

// Workflow control
router.post('/:id/pause', asyncHandler(workflowController.pauseWorkflow.bind(workflowController)));
router.post('/:id/resume', asyncHandler(workflowController.resumeWorkflow.bind(workflowController)));
router.post('/:id/cancel', asyncHandler(workflowController.cancelWorkflow.bind(workflowController)));

export default router;
