/**
 * Authentication Request Models
 * 
 * This file defines the request structures for authentication endpoints.
 * These interfaces ensure type safety for incoming request data.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Login Request - represents the structure for login requests
 */
export interface LoginRequest {
  email: string;
  password: string;
}