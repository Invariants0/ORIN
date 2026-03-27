import { Router } from 'express';
import { checkNotionHealth, getConnectionInstructions } from '@/controllers/notion-health.controller.js';
import { authenticate } from '@/middlewares/auth.middleware.js';

const router = Router();

// Public endpoint for connection instructions
router.get('/instructions', getConnectionInstructions);

// Protected endpoint for health check
router.get('/status', authenticate, checkNotionHealth);

export default router;
