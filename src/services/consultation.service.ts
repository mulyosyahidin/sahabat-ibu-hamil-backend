/**
 * Consultation Service
 * 
 * This service handles consultation-related business logic including
 * consultation retrieval, status updates, and answering operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient, ConsultationStatus, MessageContentSource, MessageDirection, MessageType } from '@/generated/prisma';
import type { UpdateConsultationStatusRequest, AnswerConsultationRequest } from '@/models/requests';
import { NotFoundError, BadRequestError } from '@/utils';
import { PaginatedResponseHelper, type PaginatedResponse } from '@/models/responses';
import { type ConsultationDto } from '@/models/dto';
import type { WhatsAppService } from './app/whatsapp';

export class ConsultationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all consultations with pagination
   */
  async getAllConsultations(page: number = 1, limit: number = 10): Promise<PaginatedResponse<ConsultationDto>> {
    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Get consultations with pagination and include chat data
    const consultations = await this.prisma.consultation.findMany({
      skip: offset,
      take: limit,
      include: {
        chat: {
          select: {
            name: true,
            age: true,
            wa_number: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get total count
    const total = await this.prisma.consultation.count();

    // Convert to DTO format
    const consultationDtos: ConsultationDto[] = consultations.map(consultation => ({
      id: consultation.id,
      chat_id: consultation.chat_id,
      message: consultation.message,
      answer: consultation.answer,
      status: consultation.status,
      viewed_at: consultation.viewed_at,
      answered_at: consultation.answered_at,
      created_at: consultation.created_at,
      updated_at: consultation.updated_at,
      chat: {
        name: consultation.chat.name,
        age: consultation.chat.age,
        wa_number: consultation.chat.wa_number,
      },
    }));

    // Return paginated response using helper
    return PaginatedResponseHelper.create(consultationDtos, page, limit, total);
  }

  /**
   * Get consultation by ID
   */
  async getConsultationById(id: number): Promise<ConsultationDto> {
    const consultation = await this.prisma.consultation.findUnique({
      where: {
        id: id,
      },
      include: {
        chat: {
          select: {
            name: true,
            age: true,
            wa_number: true,
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundError('Konsultasi tidak ditemukan');
    }

    return {
      id: consultation.id,
      chat_id: consultation.chat_id,
      message: consultation.message,
      answer: consultation.answer,
      status: consultation.status,
      viewed_at: consultation.viewed_at,
      answered_at: consultation.answered_at,
      created_at: consultation.created_at,
      updated_at: consultation.updated_at,
      chat: {
        name: consultation.chat.name,
        age: consultation.chat.age,
        wa_number: consultation.chat.wa_number,
      },
    };
  }

  /**
   * Update consultation status from WAITING to VIEWED
   */
  async updateStatus(id: number, data: UpdateConsultationStatusRequest): Promise<ConsultationDto> {
    const consultation = await this.prisma.consultation.findUnique({
      where: {
        id: id,
      }
    });

    if (!consultation) {
      throw new NotFoundError('Konsultasi tidak ditemukan');
    }

    // Validate status transition
    if (data.status === 'VIEWED' && consultation.status !== ConsultationStatus.WAITING) {
      throw new BadRequestError('Status hanya bisa diubah dari WAITING ke VIEWED');
    }

    const updateData: any = {
      status: data.status as ConsultationStatus,
      updated_at: new Date(),
    };

    // Set viewed_at timestamp when status changes to VIEWED
    if (data.status === 'VIEWED') {
      updateData.viewed_at = new Date();
    }

    const updatedConsultation = await this.prisma.consultation.update({
      where: {
        id
      },
      data: updateData,
      include: {
        chat: {
          select: {
            name: true,
            age: true,
            wa_number: true,
          },
        },
      },
    });

    return {
      id: updatedConsultation.id,
      chat_id: updatedConsultation.chat_id,
      message: updatedConsultation.message,
      answer: updatedConsultation.answer,
      status: updatedConsultation.status,
      viewed_at: updatedConsultation.viewed_at,
      answered_at: updatedConsultation.answered_at,
      created_at: updatedConsultation.created_at,
      updated_at: updatedConsultation.updated_at,
      chat: {
        name: updatedConsultation.chat.name,
        age: updatedConsultation.chat.age,
        wa_number: updatedConsultation.chat.wa_number,
      },
    };
  }

  /**
   * Answer consultation
   */
  async answer(id: number, data: AnswerConsultationRequest): Promise<ConsultationDto> {
    const consultation = await this.prisma.consultation.findUnique({
      where: {
        id: id,
      }
    });

    if (!consultation) {
      throw new NotFoundError('Konsultasi tidak ditemukan');
    }

    // Validate that consultation can be answered
    if (consultation.status === ConsultationStatus.ANSWERED) {
      throw new BadRequestError('Konsultasi sudah dijawab sebelumnya');
    }

    const updatedConsultation = await this.prisma.consultation.update({
      where: {
        id
      },
      data: {
        answer: data.answer,
        status: ConsultationStatus.ANSWERED,
        answered_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        chat: {
          select: {
            name: true,
            age: true,
            wa_number: true,
          },
        },
      },
    });

    const chat = await this.prisma.chat.findUnique({
      where: {
        id: consultation.chat_id,
      },
    });

    if (!chat) {
      throw new NotFoundError('Chat tidak ditemukan');
    }
    
    const currentStack = Array.isArray(chat?.scene_stack) ? chat!.scene_stack : ['registrasi'];
    currentStack.push('consultation.viewing.detail');

    await this.prisma.chat.update({
      where: { id: chat.id },
      data: {
        scene_stack: currentStack,
        last_active_at: new Date(),
        updated_at: new Date(),
      },
    });

    return {
      id: updatedConsultation.id,
      chat_id: updatedConsultation.chat_id,
      message: updatedConsultation.message,
      answer: updatedConsultation.answer,
      status: updatedConsultation.status,
      viewed_at: updatedConsultation.viewed_at,
      answered_at: updatedConsultation.answered_at,
      created_at: updatedConsultation.created_at,
      updated_at: updatedConsultation.updated_at,
      chat: {
        name: updatedConsultation.chat.name,
        age: updatedConsultation.chat.age,
        wa_number: updatedConsultation.chat.wa_number,
      },
    };
  }
}