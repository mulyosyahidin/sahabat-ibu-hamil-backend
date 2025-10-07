/**
 * Chat Controller
 * 
 * This controller handles HTTP requests for chat endpoints including
 * chat retrieval with pagination and message count statistics.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { PrismaClient } from '@/generated/prisma';
import { ChatService, MessageService } from '@/services';
import { ApiResponse, toChatResponseData, toMessageResponseData, type ChatsListData, type MessagesCursorData } from '@/models/responses';
import { AppError } from '@/utils';

export class ChatController {
  private chatService: ChatService;
  private messageService: MessageService;

  constructor() {
    const prisma = new PrismaClient();
    this.chatService = new ChatService(prisma);
    this.messageService = new MessageService(prisma);
  }

  /**
   * Get all chats endpoint
   * GET /chats
   */
  getAll = async (
    req: Request<ParamsDictionary, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const paginatedResult = await this.chatService.getAllChats(page, limit);
      
      // Transform the result to match ChatsListData structure
      const chatsListData: ChatsListData = {
        data: paginatedResult.data.map(chat => toChatResponseData(chat)),
        pagination: paginatedResult.pagination
      };
      
      res.json(ApiResponse.success('Chats berhasil diambil', chatsListData));
    } catch (error) {
      console.error('Get all chats error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Get chat by ID endpoint
   * GET /chats/:id
   */
  getById = async (
    req: Request<{ id: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const chatId = parseInt(req.params.id);
      
      if (isNaN(chatId)) {
        res.status(400).json(ApiResponse.error('Invalid chat ID'));
        return;
      }
      
      // find chat by ID
      const chat = await this.chatService.getChatById(chatId);
      
      // Transform to response format
      const responseData = toChatResponseData(chat);
      
      res.json(ApiResponse.success('Chat berhasil diambil', responseData));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      console.error('Get chat by ID error:', error);
      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Get messages for a specific chat with cursor-based pagination
   * Supports infinite scroll by returning messages in descending order (newest first)
   * and providing a cursor for the next batch
   */
  getMessages = async (
    req: Request<ParamsDictionary, any, any, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const chatIdParam = req.params.id;
      if (!chatIdParam) {
        res.status(400).json(ApiResponse.error('Chat ID is required'));
        return;
      }

      const chatId = parseInt(chatIdParam);
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      if (isNaN(chatId)) {
        res.status(400).json(ApiResponse.error('Invalid chat ID'));
        return;
      }

      if (limit > 100) {
        res.status(400).json(ApiResponse.error('Limit cannot exceed 100'));
        return;
      }
      
      // Get messages with cursor pagination
      const result: MessagesCursorData = await this.messageService.getMessagesByChatIdWithCursor(
        chatId, 
        cursor, 
        limit
      );
      
      res.json(ApiResponse.success('Messages berhasil diambil', result));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      console.error('Get messages error:', error);
      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };
}