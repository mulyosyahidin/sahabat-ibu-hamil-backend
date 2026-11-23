/**
 * Message Data Transfer Object (DTO)
 * 
 * This file defines the Message DTO which represents the message entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { MessageContentSource, MessageDirection, MessageType } from "@/generated/prisma";

/**
 * Message DTO - represents the message entity structure
 */
export interface MessageDto {
  id: number;
  chat_id: number;
  source: MessageContentSource;
  direction: MessageDirection;
  type: MessageType;
  body: string | null;
  media?: {
    url: string;
    type?: string;
    filename?: string;
  } | null;
  meta: any | null; // JSON type
  created_at: Date;
}