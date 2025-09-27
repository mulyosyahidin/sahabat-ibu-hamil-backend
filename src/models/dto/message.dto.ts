/**
 * Message Data Transfer Object (DTO)
 * 
 * This file defines the Message DTO which represents the message entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Message Direction Enum - indicates whether message is incoming or outgoing
 */
export enum MessageDirection {
  In = 'in',
  Out = 'out',
}

/**
 * Message Type Enum - indicates the type of message content
 */
export enum MessageType {
  Text = 'text',
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
  Other = 'other',
}

/**
 * Message Content Source Enum - indicates the source of message content
 */
export enum MessageContentSource {
  System = 'system',
  Model = 'model',
  User = 'user',
}

/**
 * WhatsApp Message Key Structure - represents the key object from WhatsApp message
 */
export interface WhatsAppMessageKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
  participant?: string;
}

/**
 * WhatsApp Message Content Structure - represents the message content from WhatsApp
 */
export interface WhatsAppMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text?: string;
  };
  imageMessage?: {
    caption?: string;
    mimetype?: string;
  };
  audioMessage?: {
    mimetype?: string;
  };
  documentMessage?: {
    fileName?: string;
    mimetype?: string;
  };
}

/**
 * Raw WhatsApp Message Structure - represents the complete WhatsApp message object
 */
export interface RawWhatsAppMessage {
  key?: WhatsAppMessageKey;
  message?: WhatsAppMessageContent;
  messageTimestamp?: number;
  status?: string;
  participant?: string;
  sessionId?: string;
  // Legacy properties for backward compatibility
  from?: string;
  body?: string;
  text?: string;
}

/**
 * Message DTO - represents the message entity structure
 */
export interface MessageDto {
  id: number;
  chatId: number;
  waNumber: string;
  source: MessageContentSource;
  direction: MessageDirection;
  type: MessageType;
  body: string | null;
  intentLabel: string | null;
  intentScore: number | null;
  meta: any | null;
  createdAt: Date;
}

/**
 * Create Message DTO - represents the structure for creating a new message
 */
export interface CreateMessageDto {
  chatId: number;
  waNumber: string;
  source: MessageContentSource;
  direction: MessageDirection;
  type?: MessageType;
  body?: string | null;
  intentLabel?: string | null;
  intentScore?: number | null;
  meta?: any | null;
}

/**
 * Message with Chat DTO - represents message with related chat information
 */
export interface MessageWithChatDto extends MessageDto {
  chat: {
    id: number;
    deviceId: number;
    waNumber: string;
    name: string | null;
    age: number | null;
    gravida: number | null;
    gestWeeks: number | null;
  };
}

export interface HandleRegistrationDataResponse {
  message: string;
  step: string;
}