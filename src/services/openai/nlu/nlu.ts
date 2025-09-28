import OpenAI from "openai";
import { z } from "zod";
import { AiLogger } from "@/services/openai";
import { AiRequestStatus, PrismaClient } from "@/generated/prisma";
import { openaiConfig } from "@/config/openai";

// Common types for Responses API parsing
export type OutputJSONPart = { type: "output_json"; parsed: unknown };
export type OutputTextPart = { type: "output_text"; text: string };
export type MessageItem = { type: "message"; role?: string; content: Array<OutputJSONPart | OutputTextPart | any> };

// Base interface for NLU results
export interface BaseNLUResult {
  valid: boolean;
}

// Configuration for NLU requests
export interface NLUConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tags?: string[];
}

// Request parameters for NLU operations
export interface NLURequestParams {
  userText: string;
  chatId?: number;
  deviceId?: number;
  systemPrompt: string;
  userPrompt?: string;
  jsonSchema: any;
  schemaName: string;
  openAiConversationId?: string;
}

export abstract class BaseNLU<T extends BaseNLUResult> {
  protected client: OpenAI;
  protected prisma: PrismaClient;
  protected aiLogger: AiLogger;
  protected config: Required<NLUConfig>;
  protected schema: z.ZodSchema<T>;

  constructor(
    schema: z.ZodSchema<T>,
    project?: string,
    tags: string[] = [],
    config: NLUConfig = {}
  ) {
    this.client = new OpenAI({ apiKey: openaiConfig.apiKey });
    this.prisma = new PrismaClient();
    this.schema = schema;
    
    // Default configuration
    this.config = {
      model: config.model || openaiConfig.model,
      temperature: config.temperature || 0,
      maxOutputTokens: config.maxOutputTokens || 40,
      tags: [...(config.tags || []), ...tags]
    };
    
    this.aiLogger = new AiLogger(this.prisma, project || openaiConfig.projectName, this.config.tags);
  }

  // Type guards for Responses API parsing
  protected isMessageItem(it: unknown): it is MessageItem {
    return !!it && typeof it === "object" && (it as any).type === "message" && Array.isArray((it as any).content);
  }

  protected isJSONPart(p: unknown): p is OutputJSONPart {
    return !!p && typeof p === "object" && (p as any).type === "output_json" && "parsed" in (p as any);
  }

  protected isTextPart(p: unknown): p is OutputTextPart {
    return !!p && typeof p === "object" && (p as any).type === "output_text" && typeof (p as any).text === "string";
  }

  // Parse response from OpenAI Responses API
  protected parseResponse(res: any): { result: T; rawText: string } {
    let messageItem: MessageItem | undefined = undefined;
    for (const it of (res.output ?? [])) {
      if (this.isMessageItem(it)) {
        messageItem = it;
        break;
      }
    }

    let result: T;
    let rawText: string = res.output_text?.trim?.() ?? "";

    if (messageItem) {
      let pickedJSON: OutputJSONPart | undefined;
      let pickedText: OutputTextPart | undefined;

      for (const part of messageItem.content) {
        if (!pickedJSON && this.isJSONPart(part)) pickedJSON = part;
        if (!pickedText && this.isTextPart(part)) pickedText = part;
        if (pickedJSON && pickedText) break;
      }

      if (pickedJSON) {
        const parsed = this.schema.safeParse(pickedJSON.parsed);
        result = parsed.success ? parsed.data : this.getDefaultResult();
      } else {
        if (!rawText && pickedText) rawText = pickedText.text;
        const match = rawText.match(/\{[\s\S]*\}/);
        const jsonText = match ? match[0] : "{}";
        try {
          const parsed = this.schema.safeParse(JSON.parse(jsonText));
          result = parsed.success ? parsed.data : this.getDefaultResult();
        } catch {
          result = this.getDefaultResult();
        }
      }
    } else {
      // Fallback to output_text
      const match = rawText.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : "{}";
      try {
        const parsed = this.schema.safeParse(JSON.parse(jsonText));
        result = parsed.success ? parsed.data : this.getDefaultResult();
      } catch {
        result = this.getDefaultResult();
      }
    }

    return { result, rawText };
  }

  // Main extraction method
  protected async extract(params: NLURequestParams): Promise<T> {
    const { userText, chatId, deviceId, systemPrompt, userPrompt, jsonSchema, schemaName, openAiConversationId } = params;
    const startTime = Date.now();
    let requestLogId: number | undefined;

    try {
      const messages = [
        {
          role: "system" as const,
          content: systemPrompt
        },
        {
          role: "user" as const,
          content: userPrompt || `Ekstrak informasi dari teks berikut: ${userText}`
        }
      ];

      const requestPayload = {
        model: this.config.model,
        input: messages,
        temperature: this.config.temperature,
        max_output_tokens: this.config.maxOutputTokens,
        store: true,
        conversation: {
          id: openAiConversationId,
        },
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema: jsonSchema
          }
        }
      } as const;

      // Log request
      requestLogId = await this.aiLogger.logRequest({
        chatId: chatId!,
        deviceId: deviceId!,
        provider: "openai",
        endpoint: "responses.create",
        model: this.config.model,
        requestPayload,
        meta: { userText, function: this.constructor.name }
      });

      // Call Responses API
      const res = await this.client.responses.create(requestPayload as any);

      console.log(res);

      // Parse response
      const { result, rawText } = this.parseResponse(res);

      // Post-process result if needed
      const finalResult = this.postProcess(result, userText);

      // Log success
      await this.aiLogger.logResponse(requestLogId, {
        responsePayload: res,
        responseText: rawText,
        inputTokens: (res as any).usage?.input_tokens || 0,
        outputTokens: (res as any).usage?.output_tokens || 0,
        totalTokens: (res as any).usage?.total_tokens || 0,
        latencyMs: Date.now() - startTime,
        status: AiRequestStatus.SUCCESS,
        meta: { extractedData: finalResult, rawResponse: rawText }
      });

      return finalResult;

    } catch (err) {
      if (requestLogId) {
        await this.aiLogger.logResponse(requestLogId, {
          responsePayload: null,
          responseText: "",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - startTime,
          status: AiRequestStatus.ERROR,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          errorCode: err instanceof Error ? err.name : "UnknownError"
        });
      }
      return this.getDefaultResult();
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract getDefaultResult(): T;
  protected abstract postProcess(result: T, userText: string): T;
}