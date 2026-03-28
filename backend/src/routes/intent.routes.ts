import { Router } from 'express';
import { intentController } from '@/controllers/intent.controller.js';
import { authenticate } from '@/middlewares/auth.middleware.js';

const router = Router();

// Apply authentication
router.use(authenticate);

/**
 * @route   POST /api/intent/detect
 * @desc    Detect intent from user input
 */
router.post('/detect', intentController.detectIntent);

/**
 * @route   POST /api/intent/batch-detect
 * @desc    Detect multiple intents in a single batch request
 */
router.post('/batch-detect', intentController.batchDetectIntents);

export default router;
