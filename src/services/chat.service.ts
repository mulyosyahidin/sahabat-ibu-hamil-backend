/**
 * Chat Service
 * 
 * This service handles chat-related business logic including
 * chat retrieval with pagination and message count statistics.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient, MessageDirection } from '@/generated/prisma';
import { NotFoundError } from '@/utils';
import { PaginatedResponseHelper, type PaginatedResponse } from '@/models/responses';
import { type ChatDto } from '@/models/dto';

export class ChatService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all chats with pagination and message counts
   */
  async getAllChats(page: number = 1, limit: number = 10): Promise<PaginatedResponse<ChatDto & { message_count: number; message_in_count: number; message_out_count: number; consultation_count: number; consultations?: any[] }>> {
    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Get chats with pagination and include device relation
    const chats = await this.prisma.chat.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            phone_number: true,
            device_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          }
        },
        _count: {
          select: {
            messages: true,
            consultations: true,
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        last_active_at: 'desc',
      },
    });

    // Get total count
    const total = await this.prisma.chat.count({
      where: {
        deleted_at: null,
      }
    });

    // Get message counts for each chat
    const chatDtos = await Promise.all(
      chats.map(async (chat) => {
        // Get message counts by direction
        const [messageInCount, messageOutCount] = await Promise.all([
          this.prisma.message.count({
            where: {
              chat_id: chat.id,
              direction: MessageDirection.IN,
            }
          }),
          this.prisma.message.count({
            where: {
              chat_id: chat.id,
              direction: MessageDirection.OUT,
            }
          })
        ]);

        const totalMessageCount = messageInCount + messageOutCount;

        return {
          id: chat.id,
          device_id: chat.device_id,
          wa_number: chat.wa_number,
          name: chat.name,
          age: chat.age,
          current_stack: Array.isArray(chat.scene_stack) && chat.scene_stack.length > 0 
            ? String(chat.scene_stack[chat.scene_stack.length - 1]) 
            : '', // Get last item from scene_stack array
          last_active_at: chat.last_active_at,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          deleted_at: chat.deleted_at,
          openai_conversation_id: chat.openai_conversation_id,
          device: chat.device,
          message_count: totalMessageCount,
          message_in_count: messageInCount,
          message_out_count: messageOutCount,
          consultation_count: chat._count.consultations,
          consultations: [] as any[], // Not included in list view for performance
        };
      })
    );

    // Return paginated response using helper
    return PaginatedResponseHelper.create(chatDtos, page, limit, total);
  }

  /**
   * Get chat by ID with message counts
   */
  async getChatById(id: number): Promise<ChatDto & { message_count: number; message_in_count: number; message_out_count: number; consultation_count: number; consultations?: any[] }> {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            phone_number: true,
            device_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          }
        },
        consultations: {
          select: {
            id: true,
            chat_id: true,
            message: true,
            answer: true,
            status: true,
            viewed_at: true,
            answered_at: true,
            created_at: true,
            updated_at: true,
          }
        },
        _count: {
          select: {
            messages: true,
            consultations: true,
          }
        }
      },
    });

    if (!chat) {
      throw new NotFoundError('Chat tidak ditemukan');
    }

    // Get message counts by direction
    const [messageInCount, messageOutCount] = await Promise.all([
      this.prisma.message.count({
        where: {
          chat_id: chat.id,
          direction: MessageDirection.IN,
        }
      }),
      this.prisma.message.count({
        where: {
          chat_id: chat.id,
          direction: MessageDirection.OUT,
        }
      })
    ]);

    const totalMessageCount = messageInCount + messageOutCount;

    return {
      id: chat.id,
      device_id: chat.device_id,
      wa_number: chat.wa_number,
      name: chat.name,
      age: chat.age,
      current_stack: Array.isArray(chat.scene_stack) && chat.scene_stack.length > 0 
        ? String(chat.scene_stack[chat.scene_stack.length - 1]) 
        : '', // Get last item from scene_stack array
      last_active_at: chat.last_active_at,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      deleted_at: chat.deleted_at,
      openai_conversation_id: chat.openai_conversation_id,
      device: chat.device,
      message_count: totalMessageCount,
      message_in_count: messageInCount,
      message_out_count: messageOutCount,
      consultation_count: chat._count.consultations,
      consultations: chat.consultations,
    };
  }
}