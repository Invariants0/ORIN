/**
 * Standard API Response wrapper from the backend.
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

/**
 * Normalized API Error structure.
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Standard Pagination structure.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Common HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
