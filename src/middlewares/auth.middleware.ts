/**
 * Authentication Middleware
 * 
 * This middleware handles JWT token verification for protected routes.
 * It extracts the token from the Authorization header and validates it.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken, type JwtPayload } from '@/utils';
import type { AuthPayload } from '@/types/auth';
import { PrismaClient } from '@/generated/prisma';

/**
 * Authentication middleware
 * Verifies JWT token and adds user information to request object
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
      return;
    }

    const payload: JwtPayload = verifyToken(token);

    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
      return;
    }

    if (user.remember_token == null) {
      res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
      return;
    }

    if (user.remember_token != payload.rememberToken) {
      res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
      return;
    }

    req.user = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
    } as AuthPayload;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token tidak valid atau sudah kedaluwarsa';

    res.status(401).json({
      success: false,
      message: errorMessage
    });
  }
};