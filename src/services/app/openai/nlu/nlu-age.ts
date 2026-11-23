import { z } from "zod";
import { BaseNLU, type BaseNLUResult } from "./nlu";
import type {Chat as ChatEntity} from "@/generated/prisma";

export interface AgeResult extends BaseNLUResult {
  age: number | null;
}

const AgeSchema = z.object({
  valid: z.boolean(),
  // null saat tidak ada usia yang tegas; integer 1..120 saat valid
  age: z.number().int().min(1).max(120).nullable()
});

class AgeNLU extends BaseNLU<AgeResult> {
  constructor() {
    super(AgeSchema);
  }

  protected getDefaultResult(): AgeResult {
    return { valid: false, age: null };
  }

  protected postProcess(result: AgeResult, userText: string): AgeResult {
    // No additional post-processing needed for age extraction
    return result;
  }

  public async extractAge(
    userText: string,
    chat: ChatEntity
  ): Promise<AgeResult> {
    const systemPrompt = 
      'Tugasmu mengekstrak USIA (bilangan bulat 1..120) dari teks Bahasa Indonesia dan ' +
      'mengembalikan HANYA satu baris JSON: {"valid": boolean, "age": number|null}.\n' +
      'ATURAN:\n' +
      '1) Terima bentuk angka ("25", "24 tahun", "usia 30 th"), atau ejaan ("dua puluh lima", "tiga puluh").\n' +
      '2) Normalisasi ke INTEGER (pembulatan tidak berlaku; pilih angka eksplisit saja). "20-an" → 20; "sekitar 24" → 24.\n' +
      '3) Jika ada beberapa angka, pilih yang paling mungkin sebagai usia (1..120) berdasarkan konteks umum.\n' +
      '4) Jika tidak ditemukan usia yang jelas, kembalikan {"valid": false, "age": null}.\n' +
      '5) Jangan menambahkan teks lain di luar JSON.\n' +
      '6) Toleransi SALAH EJA ringan pada angka terbilang Indonesia. Contoh: "dua piluh"/"dua puloh" → 20, "empat pilih"/"empat piluh"/"empat puloh" → 40, "tiga pulu" → 30. Maksud yang wajar diutamakan.\n' +
      'CONTOH:\n' +
      'Input: "25"                     -> {"valid": true, "age": 25}\n' +
      'Input: "saya 24"                -> {"valid": true, "age": 24}\n' +
      'Input: "saya usia tiga puluh"   -> {"valid": true, "age": 30}\n' +
      'Input: "umurku 20-an"           -> {"valid": true, "age": 20}\n' +
      'Input: "sekitar 27 th"          -> {"valid": true, "age": 27}\n' +
      'Input: "hello world"            -> {"valid": false, "age": null}\n' +
      'Input: "saya 200 tahun"         -> {"valid": false, "age": null}';

    const jsonSchema = {
      type: "object",
      additionalProperties: false,
      required: ["valid", "age"],
      properties: {
        valid: { type: "boolean" },
        // gunakan nullable pada level skema JSON
        age: {
          anyOf: [
            { type: "integer", minimum: 1, maximum: 120 },
            { type: "null" }
          ]
        }
      }
    };

    const params: any = {
      userText,
      systemPrompt,
      userPrompt: `Ekstrak usia (angka) dari teks berikut: ${userText}`,
      jsonSchema,
      schemaName: "AgeExtraction",
      openAiConversationId: chat.openai_conversation_id,
      chatId: chat.id,
      deviceId: chat.device_id,
    };

    return this.extract(params);
  }
}

const ageNLU = new AgeNLU();

export async function extractAge(
  userText: string,
  chat: ChatEntity
): Promise<AgeResult> {
  return ageNLU.extractAge(userText, chat);
}
