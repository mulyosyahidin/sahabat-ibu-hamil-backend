/**
 * Response Utility Functions
 * 
 * This file provides utilities for creating standardized API responses
 * including error responses and success responses with consistent formatting.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  statusCode?: number;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * Create standardized error response
 * 
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param error - Optional error details
 * @returns Formatted error response
 */
export const createErrorResponse = (
  message: string, 
  statusCode: number = 500, 
  error?: string
): ErrorResponse => {
  return {
    success: false,
    message,
    ...(error && { error }),
    statusCode
  };
};

/**
 * Create standardized success response
 * 
 * @param message - Success message
 * @param data - Optional response data
 * @param statusCode - HTTP status code (default: 200)
 * @returns Formatted success response
 */
export const createSuccessResponse = <T>(
  message: string,
  data?: T,
  statusCode: number = 200
): SuccessResponse<T> => {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
    statusCode
  };
};