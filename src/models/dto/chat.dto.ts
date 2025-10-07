/**
 * Chat Data Transfer Object (DTO)
 * 
 * This file defines the Chat DTO which represents the chat entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { DeviceDto } from './device.dto';

/**
 * Chat DTO - represents the chat entity structure
 */
export interface ChatDto {
  id: number;
  device_id: number;
  wa_number: string;
  name: string | null;
  age: number | null;
  current_stack: string; // Last item from scene_stack array
  last_active_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  openai_conversation_id: string | null;
  device?: DeviceDto;
}