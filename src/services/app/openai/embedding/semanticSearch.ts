import fs from "fs";
import path from "path";

export type FaqItem = {
  model?: string;
  embedding_dim?: number;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  embedding: number[];
};

type FaqFileArray = FaqItem[];
type FaqFileWithMeta = {
  model?: string;
  embedding_dim?: number;
  source?: string;
  created_unix?: number;
  items: FaqItem[];
};

type LoadedFaq = {
  model?: string;
  embedding_dim?: number;
  items: (FaqItem & { __norm?: Float32Array })[];
};

let _cachedFaq: LoadedFaq | null = null;

/**
 * Normalisasi vektor ke unit vector (Float32Array).
 */
function normalize(vec: ReadonlyArray<number> | Float32Array): Float32Array {
  const n = vec.length;
  const out = new Float32Array(n);

  // Hitung norm
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = vec[i] ?? 0;     // ← default 0 jika undefined
    sumSq += v * v;
  }

  const norm = Math.sqrt(sumSq);
  if (!isFinite(norm) || norm === 0) {
    // vector nol → kembalikan nol semua
    return out; // Float32Array(n) sudah terisi 0
  }

  const inv = 1 / norm;
  for (let i = 0; i < n; i++) {
    const v = vec[i] ?? 0;     // ← default 0 lagi saat tulis
    out[i] = v * inv;
  }

  return out;
}

/**
 * Cosine similarity untuk dua VEKTOR YANG SUDAH DINORMALISASI (unit vectors).
 * Aman terhadap `noUncheckedIndexedAccess`, beda panjang, dan noise floating point.
 */
 function cosineSimNormalized(
  a: ReadonlyArray<number> | Float32Array,
  b: ReadonlyArray<number> | Float32Array
): number {
  // gunakan panjang minimum agar tidak out-of-bounds
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  for (let i = 0; i < len; i++) {
    // default 0 untuk meredam kemungkinan undefined saat noUncheckedIndexedAccess
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
  }

  // clamp kecil untuk mengatasi error floating point (mis. 1.00000002 → 1)
  if (dot > 1) return 1;
  if (dot < -1) return -1;
  return dot;
}


/**
 * Muat dan cache FAQ embeddings dari /public/data/faq_data.json
 * Mendukung dua bentuk:
 * 1) Array langsung of FaqItem
 * 2) Object { model, embedding_dim, items: FaqItem[] }
 */
export function loadFaqDataOnce(): LoadedFaq {
  if (_cachedFaq) return _cachedFaq;

  const faqPath = path.join(process.cwd(), "public", "data", "faq_data.json");
  const rawText = fs.readFileSync(faqPath, "utf-8");
  const parsed = JSON.parse(rawText) as FaqFileArray | FaqFileWithMeta;

  let model: string | undefined;
  let embedding_dim: number | undefined;
  let items: FaqItem[];

  if (Array.isArray(parsed)) {
    items = parsed;
    model = parsed[0]?.model;
    embedding_dim = parsed[0]?.embedding_dim ?? parsed[0]?.embedding?.length;
  } else {
    items = parsed.items || [];
    model = parsed.model;
    embedding_dim = parsed.embedding_dim ?? parsed.items?.[0]?.embedding?.length;
  }

  if (!items.length) {
    throw new Error("FAQ data kosong: tidak ada item di faq_data.json");
  }
  if (!embedding_dim) {
    // lebih baik fail early daripada silent bug
    throw new Error("embedding_dim tidak terdeteksi dari faq_data.json");
  }

  // Pre-normalize semua embedding FAQ
  const enriched = items.map((it) => {
    const norm = normalize(it.embedding);
    return { ...it, __norm: norm };
  });

  // Bangun objek tanpa properti undefined (penting untuk exactOptionalPropertyTypes)
  const obj: LoadedFaq = {
    items: enriched,
    ...(model !== undefined ? { model } : {}),
    ...(embedding_dim !== undefined ? { embedding_dim } : {}),
  };

  _cachedFaq = obj;
  return _cachedFaq;
}

/**
 * Opsi pemeringkatan.
 */
export type RankOptions = {
  topK?: number;        // default 3
  threshold?: number;   // default 0.78
  // validasi model & dimensi (disarankan true)
  enforceModel?: boolean; // default true
  expectedModel?: string; // jika ingin paksa cocok dgn model tertentu
};

/**
 * Hasil kandidat peringkat.
 */
export type RankedCandidate = {
  score: number;  // cosine similarity
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  // informasi tambahan
  index: number;  // index di array items
};

/**
 * Lakukan ranking Top-K berdasarkan cosine similarity.
 * @param userEmbedding embedding pengguna (BELUM dinormalisasi)
 */
export function rankFaqBySimilarity(
  userEmbedding: number[],
  options: RankOptions = {}
): { candidates: RankedCandidate[]; warning?: string } {
  const { items, model, embedding_dim } = loadFaqDataOnce();

  const topK = options.topK ?? 3;
  const threshold = options.threshold ?? 0.78;

  // Validasi dimensi
  const userDim = userEmbedding.length;
  if (typeof embedding_dim === "number" && embedding_dim !== userDim) {
    return {
      candidates: [],
      warning: `Dimensi embedding tidak cocok (faq=${embedding_dim}, user=${userDim}). Pastikan model embedding sama.`
    };
  }

  // Validasi model jika diinginkan
  if ((options.enforceModel ?? true) && options.expectedModel && model && options.expectedModel !== model) {
    return {
      candidates: [],
      warning: `Model embedding tidak cocok (faq=${model}, expected=${options.expectedModel}).`
    };
  }

  const userNorm = normalize(userEmbedding);
  // Rank by cosine similarity (FAQ sudah dinormalisasi)
  const scored: RankedCandidate[] = items.map((it, idx) => {
    const score = cosineSimNormalized(userNorm, it.__norm!);
    return {
      score,
      kategori: it.kategori,
      pertanyaan: it.pertanyaan,
      jawaban: it.jawaban,
      index: idx
    };
  });

  // Urutkan desc
  scored.sort((a, b) => b.score - a.score);

  // Ambil Top-K + filter threshold
  const top = scored.slice(0, topK).filter(c => c.score >= threshold);

  return { candidates: top };
}
