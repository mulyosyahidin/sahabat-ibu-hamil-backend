/**
 * Authentication Response Models
 * 
 * This file defines the response structures for authentication endpoints.
 * These interfaces ensure consistent response formats for auth-related operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { BaseResponse } from './base.response';

/**
 * User data structure for authentication responses
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Login success response data
 */
export interface LoginResponseData {
  user: AuthUser;
  token: string;
}

/**
 * Login Response - represents the structure for login responses
 */
export interface LoginResponse extends BaseResponse<LoginResponseData> {
  success: true;
  message: string;
  data: LoginResponseData;
}