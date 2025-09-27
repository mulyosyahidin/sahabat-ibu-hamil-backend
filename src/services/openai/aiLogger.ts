import { PrismaClient, AiRequestStatus, AiModel, AiEndpoint } from "../../generated/prisma";
import { aiPricing } from "../../config/aiPricing";

export interface LogRequestParams {
  sessionId?: string | undefined;
  chatExternalId?: string | undefined;
  deviceId?: string | undefined;
  userId?: string | undefined;
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
  async logRequest(params: LogRequestParams): Promise<string> {
    const {
      sessionId,
      chatExternalId,
      deviceId,
      userId,
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
        sessionId: sessionId || null,
        chatExternalId: chatExternalId || null,
        deviceId: deviceId ? parseInt(deviceId) : null,
        userId: userId ? parseInt(userId) : null,
        provider,
        endpoint: mappedEndpoint,
        model: mappedModel,
        requestPayload,
        responseFormat: responseFormat || null,
        stream,
        toolCallingUsed,
        promptCachingUsed,
        project: this.project,
        tags: this.tags,
        meta: meta || null,
        status: "pending",
        requestedAt: new Date()
      }
    });

    return requestLog.id.toString();
  }

  /**
   * Log AI response and calculate costs
   */
  async logResponse(requestLogId: string, params: LogResponseParams): Promise<void> {
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
      where: { id: BigInt(requestLogId) },
      data: {
        responsePayload,
        responseText: responseText || null,
        inputTokens,
        outputTokens,
        totalTokens,
        inputCostUsd: costs.inputCostUsd,
        outputCostUsd: costs.outputCostUsd,
        totalCostUsd: costs.totalCostUsd,
        latencyMs,
        status,
        errorMessage: errorMessage || null,
        errorCode: errorCode || null,
        meta: meta ? { ...requestLog.meta as any, ...meta } : requestLog.meta,
        respondedAt: new Date(),
        updatedAt: new Date()
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
        requestLogId: BigInt(requestLogId),
        chunkIndex,
        content,
        finishReason: finishReason || null,
        tokens
      }
    });
  }

  /**
   * Get logs for a specific session
   */
  async getSessionLogs(sessionId: string, limit = 50) {
    return await this.prisma.aiRequestLog.findMany({
      where: { sessionId },
      orderBy: { requestedAt: "desc" },
      take: limit,
      include: {
        responseChunks: {
          orderBy: { chunkIndex: "asc" }
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
      "chat/completions": "chat_completions_create",
      "completions": "completions_create",
      "embeddings": "embeddings_create",
      "images/generations": "images_generate",
      "audio/transcriptions": "audio_transcriptions_create",
      "audio/translations": "audio_translations_create",
      "moderations": "moderations_create"
    };

    return mapping[endpoint] || "chat_completions_create";
  }

  /**
   * Map model string to enum
   */
  private mapModel(model: string): AiModel {
    const mapping: Record<string, AiModel> = {
      "gpt-4o-mini": "gpt_4o_mini",
      "gpt-4o": "gpt_4o",
      "gpt-4-turbo": "gpt_4_turbo",
      "gpt-3.5-turbo": "gpt_3_5_turbo",
      "claude-3-5-sonnet": "claude_3_5_sonnet",
      "claude-3-haiku": "claude_3_haiku",
      "gemini-pro": "gemini_pro",
      "gemini-1.5-flash": "gemini_flash"
    };

    return mapping[model] || "gpt_4o_mini";
  }
}