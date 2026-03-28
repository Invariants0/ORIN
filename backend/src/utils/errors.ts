export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(statusCode: number, message: string, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string) {
    return new APIError(400, message, true, code);
  }

  static unauthorized(message: string, code?: string) {
    return new APIError(401, message, true, code);
  }

  static forbidden(message: string, code?: string) {
    return new APIError(403, message, true, code);
  }

  static notFound(message: string, code?: string) {
    return new APIError(404, message, true, code);
  }

  static internal(message: string, code?: string) {
    return new APIError(500, message, false, code);
  }

  static serviceUnavailable(message: string, code?: string) {
    return new APIError(503, message, true, code);
  }
}

/**
 * Custom error for Gemini API key issues
 */
export class GeminiAPIError extends APIError {
  constructor(message: string, code: 'API_KEY_INVALID' | 'API_KEY_EXPIRED' | 'RATE_LIMITED') {
    super(503, message, true, code);
    this.name = 'GeminiAPIError';
  }

  static invalidKey() {
    return new GeminiAPIError(
      'Gemini API key is invalid or not configured. Please check your API key settings.',
      'API_KEY_INVALID'
    );
  }

  static expired() {
    return new GeminiAPIError(
      'Gemini API key has expired. Please update your API key in settings.',
      'API_KEY_EXPIRED'
    );
  }

  static rateLimited() {
    return new GeminiAPIError(
      'Gemini API rate limit exceeded. Please wait a moment before trying again.',
      'RATE_LIMITED'
    );
  }
}

