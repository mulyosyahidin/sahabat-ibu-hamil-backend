import OpenAI from "openai";
import { z } from "zod";
import { AiLogger } from "./aiLogger";
import { PrismaClient } from "@/generated/prisma";

export type NameResult = { valid: boolean; name: string };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const prisma = new PrismaClient();
const aiLogger = new AiLogger(prisma, "sahabat-ibu-hamil", ["nlu", "name-extraction"]);

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

export async function extractName(
  userText: string,
  sessionId?: string,
  chatId?: string,
  deviceId?: string
): Promise<NameResult> {
  const startTime = Date.now();
  let requestLogId: string | undefined;

  try {
    // Prepare request payload
    const requestPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system" as const,
          content:
            // Aturan jelas & permisif utk 1–3 kata
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
            'Input: "hello world"              -> {"valid": false, "name": ""}'
        },
        {
          role: "user" as const,
          content: `Ekstrak nama dari teks berikut (Bahasa Indonesia): ${userText}`
          // sengaja tanpa tanda kutip di sekitar userText biar tidak "terlihat" seperti string literal
        }
      ],
      max_tokens: 40,
      temperature: 0.0
    };

    // Log the request
    requestLogId = await aiLogger.logRequest({
      sessionId,
      chatExternalId: chatId,
      deviceId,
      provider: "openai",
      endpoint: "chat/completions",
      model: "gpt-4o-mini",
      requestPayload,
      meta: { userText, function: "extractName" }
    });

    const res = await client.chat.completions.create(requestPayload);

    const raw = (res.choices[0]?.message?.content ?? "").trim();

    // Ambil bagian {...} saja untuk berjaga-jaga kalau ada noise
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : "{}";

    let data = NameSchema.parse(JSON.parse(jsonText)) as NameResult;

    if (data.valid && data.name) {
      data = { valid: true, name: titleCase(data.name) };
    } else {
      data = { valid: false, name: "" };
    }

    // Log successful response
    await aiLogger.logResponse(requestLogId, {
      responsePayload: res,
      responseText: raw,
      inputTokens: res.usage?.prompt_tokens || 0,
      outputTokens: res.usage?.completion_tokens || 0,
      totalTokens: res.usage?.total_tokens || 0,
      latencyMs: Date.now() - startTime,
      status: "success",
      meta: { extractedData: data, rawResponse: raw }
    });

    return data;
  } catch (err) {
    console.error("extractName error:", err);

    // Log error response
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

    // Jika API error, kembalikan invalid
    return { valid: false, name: "" };
  }
}
