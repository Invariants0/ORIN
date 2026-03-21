export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string) {
    return new APIError(400, message);
  }

  static unauthorized(message: string) {
    return new APIError(401, message);
  }

  static forbidden(message: string) {
    return new APIError(403, message);
  }

  static notFound(message: string) {
    return new APIError(404, message);
  }

  static internal(message: string) {
    return new APIError(500, message, false);
  }
}

