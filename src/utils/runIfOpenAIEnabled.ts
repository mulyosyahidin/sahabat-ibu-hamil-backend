import { openaiConfig } from "@/config/openai";

export async function runIfOpenAIEnabled<T>(
  cb: () => Promise<T>,
  fallback: () => T | Promise<T>,
  opts?: { envVar?: string; onErrorReturnFallback?: boolean }
): Promise<T> {
  if (!openaiConfig.enabled) return await fallback();

  try {
    return await cb();
  } catch (err) {
    // opsional: log error di sini
    if (opts?.onErrorReturnFallback ?? true) {
      return await fallback();
    }
    throw err;
  }
}
