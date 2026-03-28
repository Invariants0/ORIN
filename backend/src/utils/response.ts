import { Response } from "express";

/**
 * Standardized Response Helper
 */
export const sendSuccess = (res: Response, data: any, message?: string, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    requestId: (res.req as any).requestId, // Set by app.ts middleware
  });
};

export const sendError = (res: Response, message: string, code: number | string = 500, details?: any) => {
  res.status(Number(code) || 500).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: (res.req as any).requestId,
  });
};
