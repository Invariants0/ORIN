import logger from '@/config/logger.js';

export class NotionPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionPermissionError';
  }
}

export class NotionConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionConnectionError';
  }
}

export function isNotionPermissionError(error: any): boolean {
  if (error instanceof NotionPermissionError) {
    return true;
  }

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorBody = JSON.stringify(error).toLowerCase();

  // Check for 401 unauthorized
  if (error?.statusCode === 401 || error?.status === 401) {
    return true;
  }

  // Check for permission-related keywords
  const permissionKeywords = [
    'invalid_token',
    'unauthorized',
    'permission',
    'access denied',
    'forbidden',
    'not authorized',
    'no access',
    'integration has no access',
    'share the page',
    'share a page'
  ];

  return permissionKeywords.some(keyword => 
    errorMessage.includes(keyword) || errorBody.includes(keyword)
  );
}

export function isNotionConnectionError(error: any): boolean {
  if (error instanceof NotionConnectionError) {
    return true;
  }

  const errorMessage = error?.message?.toLowerCase() || '';

  const connectionKeywords = [
    'econnrefused',
    'enotfound',
    'etimedout',
    'network',
    'connection',
    'timeout',
    'fetch failed'
  ];

  return connectionKeywords.some(keyword => errorMessage.includes(keyword));
}

export function getNotionErrorMessage(error: any): string {
  if (isNotionPermissionError(error)) {
    return 'Notion integration has no access to any pages. Please share a database or page with the integration in Notion.';
  }

  if (isNotionConnectionError(error)) {
    return 'Unable to connect to Notion. Please check your internet connection and try again.';
  }

  return error?.message || 'An unknown error occurred with Notion integration.';
}

export function logNotionError(context: string, error: any, tokenPrefix?: string): void {
  const isPermission = isNotionPermissionError(error);
  const isConnection = isNotionConnectionError(error);

  logger.error(`[${context}] Notion error`, {
    errorType: isPermission ? 'PERMISSION' : isConnection ? 'CONNECTION' : 'UNKNOWN',
    message: error?.message,
    statusCode: error?.statusCode || error?.status,
    tokenPrefix: tokenPrefix ? `${tokenPrefix.substring(0, 10)}****` : 'none',
    stack: error?.stack
  });
}
