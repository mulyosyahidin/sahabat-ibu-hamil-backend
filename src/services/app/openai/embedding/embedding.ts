// src/services/app/embedding.ts
import OpenAI from "openai";
import { PrismaClient } from "@/generated/prisma";
import { AiLogger } from "@/services/app/openai";
import { AiRequestStatus } from "@/generated/prisma";
import { openaiConfig } from "@/config/openai";

// Hasil embedding yang dikembalikan ke pemanggil
export interface UserEmbeddingResult {
  ok: boolean;
  vector: number[];
  model: string;
  dim: number;
  createdAt: Date;
  // opsional info debug
  usage?: {
    inputTokens: number;
    totalTokens: number;
  };
  error?: string;
}

type EmbedOptions = {
  model?: string;      // default: openaiConfig.embeddingModel || "text-embedding-3-small"
  tags?: string[];     // tag tambahan untuk logging
};

export class EmbeddingService {
  private client: OpenAI;
  private prisma: PrismaClient;
  private aiLogger: AiLogger;
  private defaultModel: string;

  constructor(projectName?: string, tags: string[] = []) {
    this.client = new OpenAI({ apiKey: openaiConfig.apiKey });
    this.prisma = new PrismaClient();
    this.aiLogger = new AiLogger(this.prisma, projectName || openaiConfig.projectName, tags);
    this.defaultModel = (openaiConfig as any).embeddingModel || "text-embedding-3-small";
  }

  /**
   * Buat embedding dari teks user + logging request/response ke AiLogger.
   * Pastikan model konsisten dengan yang dipakai saat membangun faq_data.json.
   */
  public async embedUserText(
    userText: string,
    ctx: {
      chatId: number;
      deviceId: number;
    },
    options: EmbedOptions = {}
  ): Promise<UserEmbeddingResult> {
    const model = options.model || this.defaultModel;
    const start = Date.now();
    let requestLogId: number | undefined;

    // requestPayload hanya untuk pencatatan (payload yang dikirim ke OpenAI lebih singkat)
    const requestPayload = {
      model,
      input: userText,
    } as const;

    try {
      // Log request
      requestLogId = await this.aiLogger.logRequest({
        chatId: ctx.chatId,
        deviceId: ctx.deviceId,
        provider: "openai",
        endpoint: "embeddings.create",
        model,
        requestPayload,
        meta: { function: "EmbeddingService.embedUserText" }
      });

      // Panggil OpenAI Embeddings API
      const res = await this.client.embeddings.create({
        model,
        input: userText,
      });

      const vector = res.data?.[0]?.embedding ?? [];
      const dim = vector.length;

      // Log success
      await this.aiLogger.logResponse(requestLogId, {
        responsePayload: res,
        responseText: "", // embeddings tidak berupa teks
        inputTokens: (res as any).usage?.prompt_tokens ?? 0,
        outputTokens: 0,
        totalTokens: (res as any).usage?.total_tokens ?? ((res as any).usage?.prompt_tokens ?? 0),
        latencyMs: Date.now() - start,
        status: AiRequestStatus.SUCCESS,
        meta: { dim, model }
      });

      return {
        ok: true,
        vector,
        dim,
        model,
        createdAt: new Date(),
        usage: {
          inputTokens: (res as any).usage?.prompt_tokens ?? 0,
          totalTokens: (res as any).usage?.total_tokens ?? ((res as any).usage?.prompt_tokens ?? 0),
        }
      };
    } catch (err: any) {
      // Log error
      if (requestLogId) {
        await this.aiLogger.logResponse(requestLogId, {
          responsePayload: null,
          responseText: "",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - start,
          status: AiRequestStatus.ERROR,
          errorMessage: err?.message || "Unknown error",
          errorCode: err?.name || "UnknownError",
        });
      }

      return {
        ok: false,
        vector: [],
        dim: 0,
        model,
        createdAt: new Date(),
        error: err?.message || "Failed to create embedding",
      };
    }
  }
}

// Singleton helper (opsional)
let _singleton: EmbeddingService | null = null;
export function getEmbeddingService() {
  if (!_singleton) {
    _singleton = new EmbeddingService();
  }
  return _singleton;
}
