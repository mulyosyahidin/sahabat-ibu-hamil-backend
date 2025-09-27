import type { Prisma } from "../generated/prisma";

export const asJsonObject = (v: Prisma.JsonValue | null | undefined): Prisma.JsonObject => {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? (v as Prisma.JsonObject) : {};
}