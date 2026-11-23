/**
 * AI Request Log Data Transfer Object (DTO)
 * 
 * This file defines the AI Request Log DTO which represents the ai_request_logs entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { AiEndpoint, AiModel, AiRequestStatus } from "@/generated/prisma";

/**
 * AI Request Log DTO - represents the ai_request_logs entity structure
 */
export interface AiRequestLogDto {
  id: bigint;
  chat_id: number | null;
  device_id: number | null;
  provider: string;
  endpoint: AiEndpoint;
  model: AiModel;
  request_payload: any; // JSON type
  response_payload: any | null; // JSON type
  response_text: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_cost_usd: number; // Decimal
  output_cost_usd: number; // Decimal
  total_cost_usd: number; // Decimal
  latency_ms: number;
  retries: number;
  status: AiRequestStatus;
  error_message: string | null;
  error_code: string | null;
  project: string | null;
  tags: any | null; // JSON type
  meta: any | null; // JSON type
  response_format: string | null;
  stream: boolean;
  tool_calling_used: boolean;
  prompt_caching_used: boolean;
  requested_at: Date;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}