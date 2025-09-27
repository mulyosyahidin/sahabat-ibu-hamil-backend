import OpenAI from "openai";
import { z } from "zod";
import { AiLogger } from "./aiLogger";
import { PrismaClient } from "@/generated/prisma";

export type AgeResult = { valid: boolean; age: number | null };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const prisma = new PrismaClient();
const aiLogger = new AiLogger(prisma, "sahabat-ibu-hamil", ["nlu", "age-extraction"]);

const AgeSchema = z.object({
  valid: z.boolean(),
  // null saat tidak ada usia yang tegas; integer 1..120 saat valid
  age: z.number().int().min(1).max(120).nullable()
});

export async function extractAge(
  userText: string,
  sessionId?: string,
  chatId?: string,
  deviceId?: string
): Promise<AgeResult> {
  const startTime = Date.now();
  let requestLogId: string | undefined;

  try {
    const requestPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system" as const,
          // Aturan tegas + few-shot untuk ejaan Indonesia
          content:
            'Tugasmu mengekstrak USIA (bilangan bulat 1..120) dari teks Bahasa Indonesia dan ' +
            'mengembalikan HANYA satu baris JSON: {"valid": boolean, "age": number|null}.\n' +
            'ATURAN:\n' +
            '1) Terima bentuk angka ("25", "24 tahun", "usia 30 th"), atau ejaan ("dua puluh lima", "tiga puluh").\n' +
            '2) Normalisasi ke INTEGER (pembulatan tidak berlaku; pilih angka eksplisit saja). "20-an" → 20; "sekitar 24" → 24.\n' +
            '3) Jika ada beberapa angka, pilih yang paling mungkin sebagai usia (1..120) berdasarkan konteks umum.\n' +
            '4) Jika tidak ditemukan usia yang jelas, kembalikan {"valid": false, "age": null}.\n' +
            '5) Jangan menambahkan teks lain di luar JSON.\n' +
            'CONTOH:\n' +
            'Input: "25"                     -> {"valid": true, "age": 25}\n' +
            'Input: "saya 24"                -> {"valid": true, "age": 24}\n' +
            'Input: "saya usia tiga puluh"   -> {"valid": true, "age": 30}\n' +
            'Input: "umurku 20-an"           -> {"valid": true, "age": 20}\n' +
            'Input: "sekitar 27 th"          -> {"valid": true, "age": 27}\n' +
            'Input: "hello world"            -> {"valid": false, "age": null}\n' +
            'Input: "saya 200 tahun"         -> {"valid": false, "age": null}'
        },
        {
          role: "user" as const,
          content: `Ekstrak usia (angka) dari teks berikut: ${userText}`
        }
      ],
      max_tokens: 40,
      temperature: 0.0
    };

    // log request
    requestLogId = await aiLogger.logRequest({
      sessionId,
      chatExternalId: chatId,
      deviceId,
      provider: "openai",
      endpoint: "chat/completions",
      model: "gpt-4o-mini",
      requestPayload,
      meta: { userText, function: "extractAge" }
    });

    const res = await client.chat.completions.create(requestPayload);
    const raw = (res.choices[0]?.message?.content ?? "").trim();

    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : "{}";

    const parsed = AgeSchema.safeParse(JSON.parse(jsonText));
    const result: AgeResult = parsed.success && parsed.data.valid && parsed.data.age != null
      ? { valid: true, age: parsed.data.age }
      : { valid: false, age: null };

    // log sukses
    await aiLogger.logResponse(requestLogId, {
      responsePayload: res,
      responseText: raw,
      inputTokens: res.usage?.prompt_tokens || 0,
      outputTokens: res.usage?.completion_tokens || 0,
      totalTokens: res.usage?.total_tokens || 0,
      latencyMs: Date.now() - startTime,
      status: "success",
      meta: { extractedData: result, rawResponse: raw }
    });

    return result;

  } catch (err) {
    // log error
    if (requestLogId) {
      await aiLogger.logResponse(requestLogId, {
        responsePayload: null,
        responseText: "",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startTime,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        errorCode: err instanceof Error ? err.name : "UnknownError"
      });
    }
    return { valid: false, age: null };
  }
}
