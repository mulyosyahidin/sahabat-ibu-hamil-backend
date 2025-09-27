// src/utils/runIfOpenAIEnabled.ts
export async function runIfOpenAIEnabled<T>(
  cb: () => Promise<T>,
  fallback: () => T | Promise<T>,
  opts?: { envVar?: string; onErrorReturnFallback?: boolean }
): Promise<T> {
  const envVar = opts?.envVar ?? "ENABLE_OPEN_AI";
  const enabled = process.env[envVar] === "true";

  if (!enabled) return await fallback();

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
