import logger from '@/config/logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  timeoutMs?: number;
  backoffMs?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 2,
    timeoutMs = 6000,
    backoffMs = 1000,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs, `Operation timed out after ${timeoutMs}ms`);
      return result;
    } catch (error: any) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
          error: error.message
        });

        if (onRetry) {
          onRetry(attempt, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
