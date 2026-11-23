/**
 * Message Response Models
 * 
 * This file defines the response structures for message endpoints.
 * These interfaces ensure consistent response formats for message-related operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { MessageDto } from '@/models/dto';
import type { BaseResponse } from './base.response';
import type { PaginatedResponse } from './paginated.response';

/**
 * Message data structure for API responses
 */
export interface MessageResponseData {
  id: number;
  chat_id: number;
  source: string;
  direction: string;
  type: string;
  body: string | null;
  meta: any | null;
  media?: {
    url: string;
    type?: string;
    filename?: string;
  } | null;
  created_at: string;
}

/**
 * Message List Response - for paginated list operations
 */
export interface MessageListResponse extends BaseResponse<PaginatedResponse<MessageResponseData>> {
  success: true;
  message: string;
  data: PaginatedResponse<MessageResponseData>;
}

/**
 * Message List Response with Cursor - for infinite scroll operations
 */
export interface MessageCursorResponse extends BaseResponse<{
  messages: MessageResponseData[];
  nextCursor: number | null;
  hasMore: boolean;
}> {
  success: true;
  message: string;
  data: {
    messages: MessageResponseData[];
    messageCount: number;
    nextCursor: number | null;
    hasMore: boolean;
  };
}

/**
 * Messages List Data - for internal use
 */
export interface MessagesListData {
  data: MessageResponseData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Messages Cursor Data - for internal use with cursor pagination
 */
export interface MessagesCursorData {
  messages: MessageResponseData[];
  messageCount: number;
  nextCursor: number | null;
  hasMore: boolean;
}

/**
 * Utility function to convert MessageDto to MessageResponseData
 * Transforms internal DTO to public API response format
 */
export function toMessageResponseData(message: MessageDto): MessageResponseData {
  return {
    id: message.id,
    chat_id: message.chat_id,
    source: message.source.toString(),
    direction: message.direction.toString(),
    type: message.type.toString(),
    body: message.body,
    meta: message.meta,
    media: message.media || null,
    created_at: message.created_at.toISOString(),
  };
}