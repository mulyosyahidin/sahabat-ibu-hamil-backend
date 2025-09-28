import { z } from "zod";
import { BaseNLU, type BaseNLUResult } from "./nlu";
import type {Chat as ChatEntity} from "../../../generated/prisma";

export interface NameResult extends BaseNLUResult {
  name: string;
}

const NameSchema = z.object({
  valid: z.boolean(),
  name: z.string()
});

const titleCase = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

class NameNLU extends BaseNLU<NameResult> {
  constructor() {
    super(NameSchema);
  }

  protected getDefaultResult(): NameResult {
    return { valid: false, name: "" };
  }

  protected postProcess(result: NameResult, userText: string): NameResult {
    // Normalisasi title-case jika valid
    return (result.valid && result.name)
      ? { valid: true, name: titleCase(result.name) }
      : { valid: false, name: "" };
  }

  public async extractName(
    userText: string,
    chat: ChatEntity
  ): Promise<NameResult> {
    const systemPrompt = 
      'Tugasmu mengekstrak NAMA ORANG dari teks berbahasa Indonesia dan ' +
      'mengembalikan HANYA satu baris JSON: {"valid": boolean, "name": string}.\n' +
      'ATURAN:\n' +
      '1) Jika teks berisi 1–3 kata alfabet (masing2 ≥2 huruf) yang tampak seperti nama pribadi, anggap SAH sebagai nama (meski huruf kecil).\n' +
      '2) Normalisasi kapitalisasi (title case) di "name".\n' +
      '3) Jika sama sekali tidak ada kandidat nama, kembalikan {"valid": false, "name": ""}.\n' +
      '4) Abaikan sapaan/komentar umum seperti: halo, hai, hello, ok, oke, baik, terima kasih, makasih, pagi, siang, sore, malam.\n' +
      '5) Jangan tambahkan penjelasan lain di luar JSON.\n' +
      'CONTOH:\n' +
      'Input: "doni"                     -> {"valid": true, "name": "Doni"}\n' +
      'Input: "puji"                     -> {"valid": true, "name": "Puji"}\n' +
      'Input: "doni milion"              -> {"valid": true, "name": "Doni Milion"}\n' +
      'Input: "ninda puji lestari"       -> {"valid": true, "name": "Ninda Puji Lestari"}\n' +
      'Input: "aku yuni"                 -> {"valid": true, "name": "Yuni"}\n' +
      'Input: "*** rendi"                -> {"valid": true, "name": "Rendi"}\n' +
      'Input: "perkenalkan saya agoy"                     -> {"valid": true, "name": "agoy"}\n' +
      'Input: "halo"                     -> {"valid": false, "name": ""}\n' +
      'Input: "hello world"              -> {"valid": false, "name": ""}';

    const jsonSchema = {
      type: "object",
      additionalProperties: false,
      required: ["valid", "name"],
      properties: {
        valid: { type: "boolean" },
        name: { type: "string" }
      }
    };

    const params: any = {
      userText,
      systemPrompt,
      userPrompt: `Ekstrak nama dari teks berikut (Bahasa Indonesia): ${userText}`,
      jsonSchema,
      schemaName: "NameExtraction",
      openAiConversationId: chat.openai_conversation_id,
      chatId: chat.id,
      deviceId: chat.device_id,
    };

    return this.extract(params);
  }
}

const nameNLU = new NameNLU();

export async function extractName(
  userText: string,
  chat: ChatEntity
): Promise<NameResult> {
  return nameNLU.extractName(userText, chat);
}
