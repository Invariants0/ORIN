import { Request, Response } from 'express';
import intentService from '@/services/ai/intent.service.js';
import logger from '@/config/logger.js';
import { APIError } from '@/utils/errors.js';
import catchAsync from '@/handlers/async.handler.js';

export const detectIntent = catchAsync(async (req: Request, res: Response) => {
  const { input } = req.body;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    throw APIError.badRequest('Input is required and must be a non-empty string');
  }

  if (input.length > 10000) {
    throw APIError.badRequest('Input exceeds maximum length of 10000 characters');
  }

  logger.info('[Intent Controller] Intent detection request received', { inputLength: input.length });

  const result = await intentService.detectIntent(input.trim());

  res.status(200).json({
    success: true,
    data: result
  });
});

export const batchDetectIntents = catchAsync(async (req: Request, res: Response) => {
  const { inputs } = req.body;

  if (!Array.isArray(inputs)) {
    throw APIError.badRequest('Inputs must be an array');
  }

  if (inputs.length === 0) {
    throw APIError.badRequest('Inputs array cannot be empty');
  }

  if (inputs.length > 50) {
    throw APIError.badRequest('Batch size cannot exceed 50 inputs');
  }

  for (const input of inputs) {
    if (typeof input !== 'string' || input.trim().length === 0) {
      throw APIError.badRequest('All inputs must be non-empty strings');
    }
  }

  logger.info('[Intent Controller] Batch intent detection request received', { count: inputs.length });

  const results = await intentService.batchDetectIntents(inputs.map(i => i.trim()));

  res.status(200).json({
    success: true,
    data: results
  });
});
