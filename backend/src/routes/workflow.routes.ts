import { Router } from 'express';
import { workflowController } from '@/controllers/workflow.controller.js';
import { authenticate } from "@/middlewares/auth.middleware.js";
import { validate } from "@/middlewares/validate.middleware.js";
import { createWorkflowSchema, getWorkflowSchema, pauseWorkflowSchema } from "@/schemas/workflow.schema.js";

const router = Router();

// Apply authentication to ALL workflow routes
router.use(authenticate);

// Workflow CRUD
router.get('/', workflowController.getWorkflows);
router.get('/statistics', workflowController.getStatistics);
router.get('/metrics', workflowController.getMetrics);
router.get('/alerts', workflowController.getAlerts);
router.delete('/alerts', workflowController.clearAlerts);

router.get('/:id', validate(getWorkflowSchema), workflowController.getWorkflowById);
router.post('/', validate(createWorkflowSchema), workflowController.createWorkflow);

// Workflow control
router.post('/:id/pause', validate(pauseWorkflowSchema), workflowController.pauseWorkflow);
router.post('/:id/resume', workflowController.resumeWorkflow);
router.post('/:id/cancel', workflowController.cancelWorkflow);

export default router;
