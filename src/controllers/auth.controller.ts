/**
 * Auth Controller
 * 
 * This controller handles HTTP requests for authentication endpoints including
 * login, user profile retrieval, and logout functionality.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { AuthService } from '../services/auth.service';
import { extractTokenFromHeader } from '../utils/jwt.util';
import { validateAndRespond } from '../utils/validation.util';
import type { LoginRequest } from '../models/requests/auth.request';
import { loginValidationSchema } from '../validations/auth.validation';

export class AuthController {
  private authService: AuthService;

  constructor() {
    const prisma = new PrismaClient();
    this.authService = new AuthService(prisma);
  }

  /**
   * Login endpoint
   * POST /auth/login
   */
  login = async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
    try {
      // Validate request body using validation utility
      const validatedData = validateAndRespond(loginValidationSchema, req.body, res);
      
      if (!validatedData) {
        // Validation failed, response already sent with 422 status
        return;
      }

      const { email, password } = validatedData;

      // Attempt login
      const result = await this.authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Berhasil login',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login gagal';
      
      res.status(401).json({
        success: false,
        message: errorMessage
      });
    }
  };

  /**
   * Get current user profile endpoint
   * GET /auth/me
   */
  me = async (req: Request, res: Response): Promise<void> => {
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

      const user = await this.authService.me(token);

      res.status(200).json({
        success: true,
        message: 'Profil pengguna berhasil diambil',
        data: {
          user
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil profil pengguna';
      
      res.status(401).json({
        success: false,
        message: errorMessage
      });
    }
  };

  /**
   * Logout endpoint
   * POST /auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
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

      const result = await this.authService.logout(token);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout gagal';
      
      res.status(401).json({
        success: false,
        message: errorMessage
      });
    }
  };
}