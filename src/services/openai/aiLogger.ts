import { PrismaClient, AiRequestStatus, AiModel, AiEndpoint } from "../../generated/prisma";
import { aiPricing } from "../../config/aiPricing";

export interface LogRequestParams {
  chatId?: number | undefined;
  deviceId?: number | undefined;
  provider?: string | undefined;
  endpoint: string;
  model: string;
  requestPayload: any;
  responseFormat?: string | undefined;
  stream?: boolean | undefined;
  toolCallingUsed?: boolean | undefined;
  promptCachingUsed?: boolean | undefined;
  meta?: any;
}

export interface LogResponseParams {
  responsePayload?: any;
  responseText?: string | undefined;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: AiRequestStatus;
  errorMessage?: string | undefined;
  errorCode?: string | undefined;
  meta?: any;
}

export interface LogStreamChunkParams {
  chunkIndex: number;
  content: string;
  finishReason?: string | undefined;
  tokens?: number | undefined;
}

export class AiLogger {
  private prisma: PrismaClient;
  private project: string;
  private tags: string[];

  constructor(prisma: PrismaClient, project: string, tags: string[] = []) {
    this.prisma = prisma;
    this.project = project;
    this.tags = tags;
  }

  /**
   * Log AI request and return request log ID
   */
  async logRequest(params: LogRequestParams): Promise<number> {
    const {
      chatId,
      deviceId,
      provider = "openai",
      endpoint,
      model,
      requestPayload,
      responseFormat,
      stream = false,
      toolCallingUsed = false,
      promptCachingUsed = false,
      meta
    } = params;

    // Map string values to enum values
    const mappedEndpoint = this.mapEndpoint(endpoint);
    const mappedModel = this.mapModel(model);

    const requestLog = await this.prisma.aiRequestLog.create({
      data: {
        chat_id: chatId || null,
        device_id: deviceId || null,
        provider,
        endpoint: mappedEndpoint,
        model: mappedModel,
        request_payload: requestPayload,
        response_format: responseFormat || null,
        stream,
        tool_calling_used: toolCallingUsed,
        prompt_caching_used: promptCachingUsed,
        project: this.project,
        tags: this.tags,
        meta: meta || null,
        status: AiRequestStatus.PENDING,
        requested_at: new Date()
      }
    });

    return Number(requestLog.id);
  }

  /**
   * Log AI response and calculate costs
   */
  async logResponse(requestLogId: number, params: LogResponseParams): Promise<void> {
    const {
      responsePayload,
      responseText,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      status,
      errorMessage,
      errorCode,
      meta
    } = params;

    // Get the original request to calculate costs
    const requestLog = await this.prisma.aiRequestLog.findUnique({
      where: { id: BigInt(requestLogId) }
    });

    if (!requestLog) {
      throw new Error(`Request log with ID ${requestLogId} not found`);
    }

    // Calculate costs
    const costs = this.calculateCosts(requestLog.model, inputTokens, outputTokens);

    await this.prisma.aiRequestLog.update({
      where: { id: requestLogId },
      data: {
        response_payload: responsePayload ? responsePayload : null,
        response_text: responseText || null,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        input_cost_usd: costs.inputCostUsd,
        output_cost_usd: costs.outputCostUsd,
        total_cost_usd: costs.totalCostUsd,
        latency_ms: latencyMs,
        status,
        error_message: errorMessage || null,
        error_code: errorCode || null,
        meta: meta ? { ...requestLog.meta as any, ...meta } : requestLog.meta,
        responded_at: new Date(),
        updated_at: new Date()
      }
    });

    // Cost summary functionality removed
  }

  /**
   * Log streaming response chunk
   */
  async logStreamChunk(requestLogId: string, params: LogStreamChunkParams): Promise<void> {
    const { chunkIndex, content, finishReason, tokens = 0 } = params;

    await this.prisma.aiResponseChunk.create({
      data: {
        request_log_id: BigInt(requestLogId),
        chunk_index: chunkIndex,
        content,
        finish_reason: finishReason || null,
        tokens
      }
    });
  }

  /**
   * Get logs for a specific session
   */
  async getChatLogs(chatId: number, limit = 50) {
    return await this.prisma.aiRequestLog.findMany({
      where: { chat_id: chatId },
      orderBy: { requested_at: "desc" },
      take: limit,
      include: {
        response_chunks: {
          orderBy: { chunk_index: "asc" }
        }
      }
    });
  }

  /**
   * Calculate costs based on model and token usage
   */
  private calculateCosts(model: AiModel, inputTokens: number, outputTokens: number) {
    const modelStr = model.toString().replace(/_/g, '-');
    const pricing = aiPricing[modelStr as keyof typeof aiPricing];
    
    if (!pricing) {
      return {
        inputCostUsd: 0,
        outputCostUsd: 0,
        totalCostUsd: 0
      };
    }

    const inputCostUsd = (inputTokens / 1000000) * pricing.input;
    const outputCostUsd = (outputTokens / 1000000) * pricing.output;
    const totalCostUsd = inputCostUsd + outputCostUsd;

    return {
      inputCostUsd: Number(inputCostUsd.toFixed(6)),
      outputCostUsd: Number(outputCostUsd.toFixed(6)),
      totalCostUsd: Number(totalCostUsd.toFixed(6))
    };
  }

  /**
   * Map endpoint string to enum
   */
  private mapEndpoint(endpoint: string): AiEndpoint {
    const mapping: Record<string, AiEndpoint> = {
      "chat/completions": "CHAT_COMPLETIONS_CREATE",
      "completions": "COMPLETIONS_CREATE",
      "embeddings": "EMBEDDINGS_CREATE",
      "images/generations": "IMAGES_GENERATE",
      "audio/transcriptions": "AUDIO_TRANSCRIPTIONS_CREATE",
      "audio/translations": "AUDIO_TRANSLATIONS_CREATE",
      "moderations": "MODERATIONS_CREATE"
    };

    return mapping[endpoint] || "CHAT_COMPLETIONS_CREATE";
  }

  /**
   * Map model string to enum
   */
  private mapModel(model: string): AiModel {
    const mapping: Record<string, AiModel> = {
      "gpt-4o-mini": "GPT_4O_MINI",
      "gpt-4o": "GPT_4O",
      "gpt-4-turbo": "GPT_4_TURBO",
      "gpt-3.5-turbo": "GPT_3_5_TURBO",
      "claude-3-5-sonnet": "CLAUDE_3_5_SONNET",
      "claude-3-haiku": "CLAUDE_3_HAIKU",
      "gemini-pro": "GEMINI_PRO",
      "gemini-1.5-flash": "GEMINI_FLASH"
    };

    return mapping[model] || "GPT_4O_MINI";
  }
}