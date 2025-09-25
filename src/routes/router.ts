/**
 * Main Application Router
 * 
 * Central routing configuration that aggregates all route modules.
 * This file serves as the main entry point for all API routes and
 * organizes them in a modular structure for better maintainability.
 */

import { Router } from 'express';
import welcomeRoutes from './welcome.route';

// Create main router instance
const router = Router();

// Mount welcome routes at root path
router.use('/', welcomeRoutes);

export default router;