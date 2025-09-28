// utils/isNumericMenuChoice.ts
export function getNumericMenuChoice(text: string): number | null {
  const t = text.trim();
  // Hanya terima 1..7 (boleh leading zero, mis. "01")
  const m = t.match(/^0*([1-8])$/);
  return m ? Number(m[1]) : null;
}
