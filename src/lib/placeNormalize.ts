// Case/diacritic-insensitive key for comparing places typed by hand
// ("İstanbul", "istanbul", "ISTANBUL" and "Istanbul" all collapse to
// "istanbul"). Turkish-aware on purpose: JS's plain toLowerCase() turns "I"
// into "i" but "İ" into "i̇" (i + combining dot), so the two dotted/dotless
// capitals are handled explicitly first.
//
// Only a comparison key, never what gets stored or shown. The SQL twin
// (public.normalize_place) must give the same result for the same input.
export function normalizePlace(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}
