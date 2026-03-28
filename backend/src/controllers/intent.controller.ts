import { Request, Response } from 'express';
import { z } from 'zod';
import intentService from '@/services/ai/intent.service.js';
import logger from '@/config/logger.js';
import { APIError } from '@/utils/errors.js';
import catchAsync from '@/handlers/async.handler.js';
import { sendSuccess } from '@/utils/response.js';

const detectIntentSchema = z.object({
  input: z.string().min(1).max(10000)
});

const batchDetectSchema = z.object({
  inputs: z.array(z.string().min(1)).min(1).max(50)
});

class IntentController {
  detectIntent = catchAsync(async (req: Request, res: Response) => {
    const parsed = detectIntentSchema.safeParse(req.body);
    if (!parsed.success) throw APIError.badRequest("Invalid input. Must be a non-empty string up to 10000 chars.");

    const { input } = parsed.data;
    const user = (req as any).user || {};
    const apiKey = user.geminiKey;

    logger.info('[Intent Controller] Intent detection request', { inputLength: input.length });
    const result = await intentService.detectIntent(input.trim(), apiKey);

    sendSuccess(res, result);
  });

  batchDetectIntents = catchAsync(async (req: Request, res: Response) => {
    const parsed = batchDetectSchema.safeParse(req.body);
    if (!parsed.success) throw APIError.badRequest("Invalid inputs. Must be an array of 1-50 non-empty strings.");

    const { inputs } = parsed.data;
    const user = (req as any).user || {};
    const apiKey = user.geminiKey;

    logger.info('[Intent Controller] Batch intent detection', { count: inputs.length });
    const results = await intentService.batchDetectIntents(inputs.map(i => i.trim()));

    sendSuccess(res, results);
  });
}

export const intentController = new IntentController();
