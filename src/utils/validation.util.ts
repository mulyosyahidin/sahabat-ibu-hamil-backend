/**
 * Validation Utility
 * 
 * This utility provides a centralized way to handle Zod validation
 * with consistent error responses. It returns validated data on success
 * or a standardized 422 error response on validation failure.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { z } from 'zod';
import type { Response } from 'express';

/**
 * Validation result type for successful validation
 */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Validation result type for failed validation
 */
export interface ValidationError<TDetails = unknown> {
  success: false;
  error: {
    message: string;
    details: TDetails;
  };
}

/**
 * Union type for validation results
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Formats Zod validation errors to a cleaner structure
 * Converts from { field: { _errors: [...] } } to { field: [...] }
 * 
 * @param zodError - The Zod error object
 * @returns Formatted error object with field names as keys and error arrays as values
 */
function formatValidationErrors(zodError: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  zodError.issues.forEach((issue) => {
    const field = issue.path.join('.');
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(issue.message);
  });

  return formatted;
}

/**
 * Validates request data using a Zod schema and returns the result
 * 
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns ValidationResult containing either success with data or error details
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data
    };
  }

  return {
    success: false,
    error: {
      message: 'Validasi gagal',
      details: formatValidationErrors(result.error)
    }
  };
}

/**
 * Validates request data and automatically sends 422 response on validation failure
 * Returns the validated data if successful, or null if validation failed (response already sent)
 * 
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param res - Express response object
 * @returns Validated data on success, null on failure (response already sent)
 */
export function validateAndRespond<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  res: Response
): T | null {
  const validationResult = validateData(schema, data);

  if (validationResult.success) {
    return validationResult.data;
  }

  // Send 422 Unprocessable Entity response
  res.status(422).json({
    success: false,
    message: validationResult.error.message,
    errors: validationResult.error.details
  });

  return null;
}

/**
 * Async version of validateAndRespond for use with async/await
 * 
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param res - Express response object
 * @returns Promise that resolves to validated data on success, null on failure
 */
export async function validateAndRespondAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  res: Response
): Promise<T | null> {
  return validateAndRespond(schema, data, res);
}