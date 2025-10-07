/**
 * Chat Response Models
 * 
 * This file defines the response structures for chat endpoints.
 * These interfaces ensure consistent response formats for chat-related operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { ChatDto } from '@/models/dto';
import type { BaseResponse } from './base.response';
import type { PaginatedResponse } from './paginated.response';
import type { ConsultationResponseData } from './consultation.response';
import { toConsultationResponseData } from './consultation.response';

/**
 * Device data structure for chat responses
 * Simplified version of DeviceDto for API responses
 */
export interface ChatDeviceResponseData {
  id: number;
  name: string;
  code: string;
  status: string;
  phone_number: string | null;
  device_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Chat data structure for API responses
 * Includes message count statistics
 */
export interface ChatResponseData {
  id: number;
  device_id: number;
  wa_number: string;
  name: string | null;
  age: number | null;
  current_stack: string;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  openai_conversation_id: string | null;
  device?: ChatDeviceResponseData | undefined;
  message_count: number;
  message_in_count: number;
  message_out_count: number;
  consultation_count: number;
  consultations?: ConsultationResponseData[] | undefined;
}

/**
 * Single Chat Response - for get by ID operations
 */
export interface ChatResponse extends BaseResponse<ChatResponseData> {
  success: true;
  message: string;
  data: ChatResponseData;
}

/**
 * Paginated chats list data structure
 * Extends the generic PaginatedResponse for chats
 */
export interface ChatsListData extends PaginatedResponse<ChatResponseData> {}

/**
 * Chats List Response - for get all chats operation
 */
export interface ChatsListResponse extends BaseResponse<ChatsListData> {
  success: true;
  message: string;
  data: ChatsListData;
}

/**
 * Utility function to convert ChatDto with message counts to ChatResponseData
 * Transforms internal DTO to public API response format
 */
export function toChatResponseData(chat: ChatDto & { message_count: number; message_in_count: number; message_out_count: number; consultation_count: number; consultations?: any[] }): ChatResponseData {
  return {
    id: chat.id,
    device_id: chat.device_id,
    wa_number: chat.wa_number,
    name: chat.name,
    age: chat.age,
    current_stack: chat.current_stack,
    last_active_at: chat.last_active_at ? chat.last_active_at.toISOString() : null,
    created_at: chat.created_at.toISOString(),
    updated_at: chat.updated_at.toISOString(),
    deleted_at: chat.deleted_at ? chat.deleted_at.toISOString() : null,
    openai_conversation_id: chat.openai_conversation_id,
    device: chat.device ? {
      id: chat.device.id,
      name: chat.device.name,
      code: chat.device.code,
      status: chat.device.status.toString(),
      phone_number: chat.device.phone_number,
      device_id: chat.device.device_id,
      created_at: chat.device.created_at.toISOString(),
      updated_at: chat.device.updated_at.toISOString(),
      deleted_at: chat.device.deleted_at ? chat.device.deleted_at.toISOString() : null,
    } : undefined,
    message_count: chat.message_count,
    message_in_count: chat.message_in_count,
    message_out_count: chat.message_out_count,
    consultation_count: chat.consultation_count,
    consultations: chat.consultations?.map(consultation => 
      toConsultationResponseData(consultation, false)
    ) || undefined,
  };
}