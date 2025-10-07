/**
 * Consultation Response Models
 * 
 * This file defines response interfaces for consultation endpoints
 * following the established response pattern.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { ConsultationDto } from '@/models/dto';
import type { PaginationMeta } from './paginated.response';

/**
 * Consultation response data structure
 */
export interface ConsultationResponseData {
  id: number;
  chat_id: number;
  message: string | null;
  answer: string | null;
  status: string;
  viewed_at: string | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
  chat?: {
    name: string | null;
    age: number | null;
    wa_number: string;
  };
}

/**
 * Single consultation response
 */
export interface ConsultationResponse {
  success: boolean;
  message: string;
  data: ConsultationResponseData;
}

/**
 * Consultations list data structure
 */
export interface ConsultationsListData {
  data: ConsultationResponseData[];
  pagination: PaginationMeta;
}

/**
 * Consultations list response
 */
export interface ConsultationsListResponse {
  success: boolean;
  message: string;
  data: ConsultationsListData;
}

/**
 * Utility function to convert ConsultationDto to ConsultationResponseData
 */
export function toConsultationResponseData(consultation: ConsultationDto, includeChat: boolean = true): ConsultationResponseData {
  return {
    id: consultation.id,
    chat_id: consultation.chat_id,
    message: consultation.message,
    answer: consultation.answer,
    status: consultation.status,
    viewed_at: consultation.viewed_at ? consultation.viewed_at.toISOString() : null,
    answered_at: consultation.answered_at ? consultation.answered_at.toISOString() : null,
    created_at: consultation.created_at.toISOString(),
    updated_at: consultation.updated_at.toISOString(),
    ...(includeChat && consultation.chat && {
      chat: {
        name: consultation.chat.name,
        age: consultation.chat.age,
        wa_number: consultation.chat.wa_number,
      },
    }),
  };
}