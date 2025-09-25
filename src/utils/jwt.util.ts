/**
 * JWT Utility Functions
 * 
 * This file provides utility functions for JWT token generation, verification,
 * and extraction. It handles authentication token operations throughout the application.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken';
import type { UserDto } from '../models/dto/user.dto';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: number;
  email: string;
  rememberToken: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export const generateToken = (user: Pick<UserDto, 'id' | 'email'>, rememberToken: string): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    rememberToken,
  };

  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * Verify JWT token and return payload
 */
export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret as string) as JwtPayload;
    return decoded;
  } catch {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
};

/**
 * Decode token without verification (for debugging purposes)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
};