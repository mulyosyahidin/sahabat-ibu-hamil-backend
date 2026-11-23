/**
 * Auth Routes
 * 
 * This file defines the authentication routes including login, user profile,
 * and logout endpoints.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { AuthController } from '@/controllers';
import { authMiddleware } from '@/middlewares';

const router = Router();
const authController = new AuthController();

/**
 * POST /auth/login
 * Login user with email and password
 */
router.post('/login', authController.login);

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authMiddleware, authController.me.bind(authController));

/**
 * POST /auth/logout
 * Logout user (requires authentication)
 */
router.delete('/logout', authMiddleware, authController.logout.bind(authController));

export default router;