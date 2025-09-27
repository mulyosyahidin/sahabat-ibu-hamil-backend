import OpenAI from "openai";
import { z } from "zod";
import { AiLogger } from "./aiLogger";
import { PrismaClient } from "@/generated/prisma";

export type MenuChoiceResult = { valid: boolean; choice: number | null };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const prisma = new PrismaClient();
const aiLogger = new AiLogger(prisma, "sahabat-ibu-hamil", ["nlu", "menu-choice"]);

const MenuChoiceSchema = z.object({
  valid: z.boolean(),
  choice: z.number().int().min(1).max(7).nullable()
});

export async function extractMenuChoice(
  userText: string,
  sessionId?: string,
  chatId?: string,
  deviceId?: string
): Promise<MenuChoiceResult> {
  const startTime = Date.now();
  let requestLogId: string | undefined;

  const requestPayload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system" as const,
        content:
`Kamu memetakan input pengguna ke pilihan MENU UTAMA (1..7) dan mengembalikan HANYA satu baris JSON:
{"valid": boolean, "choice": number|null}

DAFTAR MENU:
1: Info Anemia
2: Info Tablet Tambah Darah (TTD)
3: Tips Gizi Praktis
4: Klarifikasi Mitos
5: Reminder Harian
6: Untuk Suami & Keluarga
7: FAQ & Konsultasi Bidan

ATURAN:
- Terima bentuk angka ("1", "nomor 5", "no enam", "dua", "tujuh").
- Terima frasa sinonim/kata kunci:
  • 1: "anemia", "informasi anemia", "tentang anemia", "informasi anemia"
  • 2: "ttd", "tablet tambah darah", "tablet penambah darah", "zat besi", "fe", "minum tablet", "informasi darah", "informasi ttd"
  • 3: "gizi", "tips gizi", "nutrisi", "tips makan", "menu sehat", "informasi gizi"
  • 4: "mitos", "klarifikasi mitos", "fakta vs mitos", "hoax", "informasi mitos"
  • 5: "reminder", "pengingat", "notifikasi", "ingatkan", "jadwal minum"
  • 6: "suami", "keluarga", "untuk suami", "peran suami"
  • 7: "faq", "konsultasi", "bidan", "tanya bidan", "pertanyaan umum"
- Jika jelas mengarah ke salah satu menu → valid:true, choice=nomornya.
- Jika ambigu/tidak nyambung → valid:false, choice:null.
- Jangan tambahkan teks lain di luar JSON.

CONTOH:
"1"                  -> {"valid": true, "choice": 1}
"3"                  -> {"valid": true, "choice": 3}
"dua"                -> {"valid": true, "choice": 2}
"saya mau info no empat" -> {"valid": true, "choice": 4}
"nomor 5"            -> {"valid": true, "choice": 5}
"no enam"            -> {"valid": true, "choice": 6}
"informasi anemia"   -> {"valid": true, "choice": 1}
"anemia"             -> {"valid": true, "choice": 1}
"tentang anemia"     -> {"valid": true, "choice": 1}
"informasi darah"    -> {"valid": true, "choice": 2}
"informasi ttd"      -> {"valid": true, "choice": 2}
"informasi gizi"     -> {"valid": true, "choice": 3}
"informasi mitos"    -> {"valid": true, "choice": 4}
"tentang mitos"      -> {"valid": true, "choice": 4}
"halo"               -> {"valid": false, "choice": null}`
      },
      {
        role: "user" as const,
        // tanpa kutip supaya tak dibaca literal
        content: `Petakan input ini ke nomor menu (1..7): ${userText}`
      }
    ],
    max_tokens: 40,
    temperature: 0.0
  };

  try {
    // log request
    requestLogId = await aiLogger.logRequest({
      sessionId, chatExternalId: chatId, deviceId,
      provider: "openai",
      endpoint: "chat/completions",
      model: "gpt-4o-mini",
      requestPayload,
      meta: { userText, function: "extractMenuChoice" }
    });

    const res = await client.chat.completions.create(requestPayload);
    const raw = (res.choices[0]?.message?.content ?? "").trim();

    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : "{}";

    const parsed = MenuChoiceSchema.safeParse(JSON.parse(jsonText));
    const result: MenuChoiceResult =
      parsed.success ? parsed.data : { valid: false, choice: null };

    // log sukses
    await aiLogger.logResponse(requestLogId, {
      responsePayload: res,
      responseText: raw,
      inputTokens: res.usage?.prompt_tokens || 0,
      outputTokens: res.usage?.completion_tokens || 0,
      totalTokens: res.usage?.total_tokens || 0,
      latencyMs: Date.now() - startTime,
      status: "success",
      meta: { parsed: result }
    });

    return result;
  } catch (err: any) {
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
        errorMessage: err?.message ?? String(err),
        errorCode: err?.name ?? "UnknownError"
      });
    }
    return { valid: false, choice: null };
  }
}
