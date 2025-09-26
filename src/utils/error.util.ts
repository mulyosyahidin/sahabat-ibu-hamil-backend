/**
 * Error Utility Functions
 * 
 * This file provides custom error classes and error handling utilities
 * for consistent error management throughout the application.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Custom Application Error class
 * Extends the built-in Error class with additional properties for HTTP status codes
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
    
    this.name = this.constructor.name;
  }
}

/**
 * Validation Error class
 * Specific error type for validation failures
 */
export class ValidationFailedError<TDetails = unknown> extends AppError {
  public readonly details?: TDetails;

  constructor(details?: TDetails, message = 'Validation failed') {
    super(message, 422);
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * Not Found Error class
 * Specific error type for resource not found scenarios
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Unauthorized Error class
 * Specific error type for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

/**
 * Forbidden Error class
 * Specific error type for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403);
  }
}

/**
 * Conflict Error class
 * Specific error type for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Bad Request Error class
 * Specific error type for bad request scenarios
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

/**
 * Internal Server Error class
 * Specific error type for internal server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

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
 * Create standardized error response
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