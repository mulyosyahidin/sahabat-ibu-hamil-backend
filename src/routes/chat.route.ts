/**
 * Chat Routes
 * 
 * This file defines the chat routes for retrieving chat data
 * for admin UI management endpoints.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { ChatController } from '@/controllers';
import { authMiddleware } from '@/middlewares';

const router = Router();
const chatController = new ChatController();

// GET /chats - Get all chats with pagination
router.get('/', authMiddleware, chatController.getAll);

// GET /chats/:id - Get chat by ID
router.get('/:id', authMiddleware, chatController.getById);

// GET /chats/:id/messages - Get messages for a specific chat with cursor pagination
router.get('/:id/messages', authMiddleware, chatController.getMessages);

export default router;