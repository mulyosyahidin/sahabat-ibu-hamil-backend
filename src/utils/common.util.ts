/**
 * Common Utility Functions
 * 
 * This file contains small helper functions that are used across the application.
 * These utilities provide common functionality like JSON handling, menu parsing,
 * and conditional execution based on configuration.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Prisma } from "@/generated/prisma";
import { openaiConfig } from "@/config/openai";

/**
 * Safely converts a Prisma JsonValue to JsonObject
 * Returns empty object if value is null, undefined, or not an object
 * 
 * @param v - Prisma JsonValue to convert
 * @returns JsonObject or empty object
 */
export const asJsonObject = (v: Prisma.JsonValue | null | undefined): Prisma.JsonObject => {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? (v as Prisma.JsonObject) : {};
};

/**
 * Extracts numeric menu choice from text input
 * Accepts numbers 1-8 with optional leading zeros (e.g., "01", "1", "08")
 * 
 * @param text - Input text to parse
 * @returns Numeric choice (1-8) or null if invalid
 */
export function getNumericMenuChoice(text: string): number | null {
  const t = text.trim();
  // Only accept 1-8 (allows leading zeros, e.g., "01")
  const m = t.match(/^0*([1-8])$/);
  return m ? Number(m[1]) : null;
}

/**
 * Conditionally executes a callback if OpenAI is enabled, otherwise returns fallback
 * Provides error handling with optional fallback on error
 * 
 * @param cb - Callback to execute if OpenAI is enabled
 * @param fallback - Fallback function to execute if OpenAI is disabled or on error
 * @param opts - Options for error handling
 * @returns Result from callback or fallback
 */
export async function runIfOpenAIEnabled<T>(
  cb: () => Promise<T>,
  fallback: () => T | Promise<T>,
  opts?: { envVar?: string; onErrorReturnFallback?: boolean }
): Promise<T> {
  if (!openaiConfig.enabled) return await fallback();

  try {
    return await cb();
  } catch (err) {
    // Optional: log error here
    if (opts?.onErrorReturnFallback ?? true) {
      return await fallback();
    }
    throw err;
  }
}

export const setCustomTime = (
  d: Date,
  t: string | null | undefined,
  defH = 9,
  defM = 0
) => {
  const str = typeof t === 'string' ? t.trim() : '';
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(str); // RegExpExecArray | null

  // Ambil string jam/menit dengan fallback aman
  const hourStr   = (m && m[1] !== undefined) ? m[1] : String(defH);
  const minuteStr = (m && m[2] !== undefined) ? m[2] : String(defM);

  const h   = Number.parseInt(hourStr, 10);
  const min = Number.parseInt(minuteStr, 10);

  d.setHours(h, min, 0, 0);
}
