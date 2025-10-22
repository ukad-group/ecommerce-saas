/**
 * API Type Definitions
 *
 * Defines common API response types and error handling.
 * Based on specs/002-cart-order-management/data-model.md
 */

/**
 * API error response
 * Standard error structure returned by the API
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

/**
 * Paginated response wrapper
 * Generic wrapper for paginated list responses
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic API response wrapper
 * Standard response structure for single-entity responses
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}
