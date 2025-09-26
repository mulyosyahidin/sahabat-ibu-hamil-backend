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
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { PrismaClient } from '../generated/prisma';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../models/responses/base.response';
import { validateAndRespond } from '../utils/validation.util';
import type { LoginRequest } from '../models/requests/auth.request';
import { loginValidationSchema } from '../validations/auth.validation';
import { AppError } from '../utils/error.util';

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
  login = async (
    req: Request<ParamsDictionary, unknown, LoginRequest, ParsedQs>,
    res: Response
  ): Promise<void> => {
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
   * Get current user info
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.user.id;

      if (!userId) {
        res.status(401).json(ApiResponse.error('Unauthorized'));
        return;
      }

      const user = await this.authService.me(userId);

      if (!user) {
        res.status(404).json(ApiResponse.error('User tidak ditemukan'));
        return;
      }

      res.json(ApiResponse.success('Data user berhasil diambil', user));
    } catch (err) {
      const error = err as unknown;

      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.user.id;

      if (!userId) {
        res.status(401).json(ApiResponse.error('Unauthorized'));
        return;
      }

      await this.authService.logout(userId);

      res.json(ApiResponse.success('Berhasil logout'));
    } catch (err) {
      const error = err as unknown;

      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  }
}