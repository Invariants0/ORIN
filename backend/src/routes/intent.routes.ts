import { Router } from 'express';
import { detectIntent, batchDetectIntents } from '../controllers/intent.controller.js';

const router = Router();

router.post('/detect', detectIntent);
router.post('/batch-detect', batchDetectIntents);

export default router;
