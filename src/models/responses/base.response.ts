/**
 * Base Response Models
 * 
 * Provides standardized response structures and utility methods for consistent
 * API responses across the application. This ensures all endpoints return
 * responses in a uniform format for better client-side handling.
 */

/**
 * Base response interface for all API responses
 * 
 * @template T - Type of the data payload
 */
export interface BaseResponse<T = unknown> {
  /** Indicates whether the request was successful */
  success: boolean;
  /** Human-readable message describing the response */
  message: string;
  /** Optional data payload (only present in successful responses) */
  data?: T;
  /** Optional error details (only present in error responses) */
  errors?: object;
}

/**
 * Helper class to create standardized API responses
 * 
 * Provides static methods to generate consistent response objects
 * for different scenarios (success, error, validation error).
 */
export class ApiResponse {
  /**
   * Create a successful response
   * 
   * @template T - Type of the data payload
   * @param message - Success message to include in response
   * @param data - Optional data payload to include
   * @returns Standardized success response object
   */
  static success<T>(message: string, data?: T): BaseResponse<T> {
    return {
      success: true,
      message,
      ...(data !== undefined && { data })
    };
  }

  /**
   * Create an error response
   * 
   * @param message - Error message to include in response
   * @param errors - Optional error details object
   * @returns Standardized error response object
   */
  static error(message: string, errors?: object): BaseResponse {
    return {
      success: false,
      message,
      ...(errors && { errors })
    };
  }

  /**
   * Create a validation error response
   * 
   * Specifically designed for validation failures where detailed
   * error information needs to be provided to the client.
   * 
   * @param message - Validation error message
   * @param errors - Detailed validation error information
   * @returns Standardized validation error response object
   */
  static validationError(message: string, errors: object): BaseResponse {
    return {
      success: false,
      message,
      errors
    };
  }
}