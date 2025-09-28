/**
 * Welcome Routes
 * 
 * Defines routes for basic application endpoints including welcome message
 * and health check functionality. These routes provide essential API information
 * and server status monitoring capabilities.
 */

import { Router } from 'express';
import { WelcomeController } from '@/controllers';

const router = Router();

// GET / - Welcome message with API information
router.get('/', WelcomeController.getWelcome);

// GET /health - Server health status and metrics
router.get('/health', WelcomeController.getHealth);

export default router;