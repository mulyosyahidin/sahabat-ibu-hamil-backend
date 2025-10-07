/**
 * Main Application Router
 * 
 * Central routing configuration that aggregates all route modules.
 * This file serves as the main entry point for all API routes and
 * organizes them in a modular structure for better maintainability.
 */

import { Router } from 'express';
import welcomeRoutes from './welcome.route';
import authRoutes from './auth.route';
import consultationRoutes from './consultation.route';
import deviceRoutes from './device.route';
import chatRoutes from './chat.route';
import overviewRoutes from './overview.route';

// Create main router instance
const router = Router();

// Mount welcome routes at root path
router.use('/', welcomeRoutes);

// Mount auth routes at /auth path
router.use('/auth', authRoutes);

// Mount consultation routes at /consultations path
router.use('/consultations', consultationRoutes);

// Mount device routes at /devices path
router.use('/devices', deviceRoutes);

// Mount chat routes at /chats path
router.use('/chats', chatRoutes);

// Mount overview routes at /overview path
router.use('/overview', overviewRoutes);


export default router;