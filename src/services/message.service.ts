/**
 * Message Service
 * 
 * This service handles message-related business logic including
 * message retrieval with pagination for infinite scroll functionality.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient } from '@/generated/prisma';
import { NotFoundError } from '@/utils';
import { PaginatedResponseHelper, type PaginatedResponse } from '@/models/responses';
import { type MessageDto } from '@/models/dto';
import { toMessageResponseData, type MessagesCursorData } from '@/models/responses/message.response';

export class MessageService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get messages for a specific chat with pagination
   * Messages are ordered by created_at DESC (newest first)
   * For infinite scroll, we load newer messages first
   */
  async getMessagesByChatId(
    chatId: number, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<MessageDto>> {
    // First, verify that the chat exists
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat) {
      throw new NotFoundError('Chat tidak ditemukan');
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count of messages for this chat
    const total = await this.prisma.message.count({
      where: { chat_id: chatId }
    });

    // Get messages with pagination, ordered by created_at DESC (newest first)
    const messages = await this.prisma.message.findMany({
      where: { chat_id: chatId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });

    // Transform to DTOs
    const messageDtos: MessageDto[] = messages.map(message => ({
      id: message.id,
      chat_id: message.chat_id,
      source: message.source,
      direction: message.direction,
      type: message.type,
      body: message.body,
      meta: message.meta,
      media: message.media ? (typeof message.media === 'string' ? JSON.parse(message.media) : message.media) : null,
      created_at: message.created_at,
    }));

    // Return paginated response using helper
    return PaginatedResponseHelper.create(messageDtos, page, limit, total);
  }

  /**
   * Get messages for infinite scroll with cursor-based pagination
   * This method is more efficient for large datasets
   */
  async getMessagesByChatIdWithCursor(
    chatId: number,
    cursor?: number, // message ID to start from
    limit: number = 20
  ): Promise<MessagesCursorData> {
    // First, verify that the chat exists
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat) {
      throw new NotFoundError('Chat tidak ditemukan');
    }

    // Build where clause for cursor-based pagination
    const whereClause: any = { chat_id: chatId };

    const allMessagesCount = await this.prisma.message.count({ where: whereClause });
    
    if (cursor) {
      // For infinite scroll going up (loading older messages)
      // We want messages with ID less than cursor (older messages)
      whereClause.id = { lt: cursor };
    }

    // Get messages with cursor pagination, ordered by created_at DESC (newest first)
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit + 1, // Take one extra to check if there are more
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    
    // Remove the extra message if it exists
    if (hasMore) {
      messages.pop();
    }

    // Get the next cursor (ID of the last message)
    const nextCursor = messages.length > 0 ? messages[messages.length - 1]?.id || null : null;

    // Transform to DTOs
    const messageDtos: MessageDto[] = messages.map(message => ({
      id: message.id,
      chat_id: message.chat_id,
      source: message.source,
      direction: message.direction,
      type: message.type,
      body: message.body,
      meta: message.meta,
      media: message.media ? (typeof message.media === 'string' ? JSON.parse(message.media) : message.media) : null,
      created_at: message.created_at,
    }));

    return {
      messages: messageDtos.map(toMessageResponseData),
      messageCount: allMessagesCount,
      nextCursor,
      hasMore,
    };
  }
}