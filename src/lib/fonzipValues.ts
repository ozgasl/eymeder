// Select-type user-defined values (key_type 7/8) come back as objects or
// arrays of them, not strings (a first probe printed "[object Object]").
export function flattenValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.map(flattenValue).filter(Boolean).join(", ");
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["text", "name", "label", "value"]) {
      if (typeof o[key] === "string" && o[key]) return (o[key] as string).trim();
    }
    return JSON.stringify(raw);
  }
  return String(raw).trim();
}
