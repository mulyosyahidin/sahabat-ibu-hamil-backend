import { z } from "zod";
import { BaseNLU, type BaseNLUResult } from "./nlu";
import type {Chat as ChatEntity} from "@/generated/prisma";

export type MenuChoiceResult = { valid: boolean; choice: number | null };

interface MenuResult extends BaseNLUResult {
  valid: boolean;
  choice: number | null;
}

const MenuChoiceSchema = z.object({
  valid: z.boolean(),
  // NOTE: set 1..8 karena di prompt ada opsi 8: Profil
  choice: z.number().int().min(1).max(9).nullable()
});

class MenuNLU extends BaseNLU<MenuResult> {
  constructor() {
    super(MenuChoiceSchema);
  }

  protected getDefaultResult(): MenuResult {
    return { valid: false, choice: null };
  }

  protected postProcess(rawResult: any): MenuResult {
    const parsed = MenuChoiceSchema.safeParse(rawResult);
    return parsed.success ? parsed.data : this.getDefaultResult();
  }

  async extractMenuChoice(
    userText: string,
    chat: ChatEntity
  ): Promise<MenuChoiceResult> {
    const systemPrompt = `Kamu memetakan input pengguna ke pilihan MENU UTAMA (1..7) dan mengembalikan HANYA satu baris JSON:
{"valid": boolean, "choice": number|null}

DAFTAR MENU:
1: Info Anemia
2: Info Tablet Tambah Darah (TTD)
3: Tips Gizi Praktis
4: Klarifikasi Mitos
5: Reminder Harian
6: Untuk Suami & Keluarga
7: FAQ
8: Konsultasi Bidan
9: Profil

ATURAN:
- Terima bentuk angka ("1", "nomor 5", "no enam", "dua", "tujuh").
- Terima frasa sinonim/kata kunci:
  • 1: "anemia", "informasi anemia", "tentang anemia", "informasi anemia"
  • 2: "ttd", "tablet tambah darah", "tablet penambah darah", "zat besi", "fe", "minum tablet", "informasi darah", "informasi ttd"
  • 3: "gizi", "tips gizi", "nutrisi", "tips makan", "menu sehat", "informasi gizi"
  • 4: "mitos", "klarifikasi mitos", "fakta vs mitos", "hoax", "informasi mitos"
  • 5: "reminder", "pengingat", "notifikasi", "ingatkan", "jadwal minum"
  • 6: "suami", "keluarga", "untuk suami", "peran suami"
  • 7: "faq", "tanya", "pertanyaan umum"
  • 8: "konsultasi", "bidan", "tanya bidan", "pertanyaan bidan"
  • 9: "profil", "edit profil", "ubah nama", "ubah umur", "informasi profil", "siapa saya", "data saya"

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
"nama saya"          -> {"valid": true, "choice": 8}
"siapa saya"         -> {"valid": true, "choice": 8}
"halo"               -> {"valid": false, "choice": null}`;

    const params: any = {
      userText,
      systemPrompt,
      userPrompt: `Petakan input ini ke nomor menu (1..8): ${userText}`,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["valid", "choice"],
        properties: {
          valid: { type: "boolean" },
          choice: {
            anyOf: [
              { type: "integer", minimum: 1, maximum: 8 }, // sinkron dgn prompt yg punya opsi 8
              { type: "null" }
            ]
          }
        }
      },
      schemaName: "MenuChoice",
      openAiConversationId: chat.openai_conversation_id,
      chatId: chat.id,
      deviceId: chat.device_id,
    };

    return this.extract(params);
  }
}

const menuNLU = new MenuNLU();

export async function extractMenuChoice(
  userText: string,
  chat: ChatEntity
): Promise<MenuChoiceResult> {
  return menuNLU.extractMenuChoice(userText, chat);
}
