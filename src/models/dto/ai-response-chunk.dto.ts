/**
 * AI Response Chunk Data Transfer Object (DTO)
 * 
 * This file defines the AI Response Chunk DTO which represents the ai_response_chunks entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * AI Response Chunk DTO - represents the ai_response_chunks entity structure
 */
export interface AiResponseChunkDto {
  id: bigint;
  request_log_id: bigint;
  chunk_index: number;
  content: string;
  finish_reason: string | null;
  tokens: number;
  created_at: Date;
}