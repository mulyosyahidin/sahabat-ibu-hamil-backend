/**
 * Authentication Validation Schemas
 * 
 * This file defines Zod validation schemas for authentication endpoints.
 * These schemas ensure data integrity and provide type-safe validation
 * for incoming requests.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Login Request Validation Schema
 * Validates email and password fields for login requests
 */
export const loginValidationSchema = z.object({
  email: z
    .string({ message: "Email tidak boleh kosong" })
    .trim()
    .min(12, { message: "Email minimal 12 karakter" })
    .email({ message: "Email tidak valid" }),
  
  password: z
    .string({
      message: "Password tidak boleh kosong",
    })
    .min(6, {
      message: "Password minimal 6 karakter",
    })
    .max(100, {
      message: "Password maksimal 100 karakter",
    }),
});

/**
 * Type inference from the login validation schema
 */
export type LoginValidationInput = z.infer<typeof loginValidationSchema>;