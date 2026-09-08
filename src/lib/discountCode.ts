// Discount codes for partner brands.
//
// A brand either hands us its own code ("EYBOGLU20") or gives us nothing but a
// discount rate, in which case we generate one from that rate: %10 -> EYB10.
// Codes are unique platform-wide (a cashier types a code and it must resolve
// to one brand), so generation also has to settle collisions between two
// brands that both give the same percentage.
//
// Single-use campaigns derive a per-member code from the campaign code
// (EYB10 -> EYB10-7F3K2A). This has nothing to do with the personal membership
// QR code in `user_qr_codes`, which stays the member's identity credential.

export const CODE_PREFIX = "EYB";

/** Days a per-member single-use code stays valid when the campaign itself has no end date. */
export const DEFAULT_MEMBER_CODE_DAYS = 30;

/**
 * A shared code may legitimately be used again and again, so repeat use is
 * counted rather than blocked. Two entries this close together are a
 * double-submit or a cashier entering the same sale twice, not two visits.
 */
export const DUPLICATE_REDEMPTION_WINDOW_MS = 2 * 60 * 1000;

// No I/O/0/1 - these codes get read aloud and retyped at a till.
const MEMBER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TURKISH_MAP: Record<string, string> = {
  ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
  ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
};

/** Folds Turkish letters to ASCII so a generated code is typeable on any keyboard. */
export function foldTurkish(input: string): string {
  return input.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_MAP[ch] ?? ch);
}

/**
 * Pulls the discount rate out of free-text `discount_info`: "%15 indirim",
 * "15% off" and "yüzde 20" all yield a number; "1 alana 1 bedava" yields null
 * because it carries no rate at all. Fractions are floored (%12,5 -> 12).
 */
export function parseDiscountPercent(discountInfo: string | null | undefined): number | null {
  if (!discountInfo) return null;
  const text = foldTurkish(discountInfo).toLowerCase();

  const patterns = [
    /%\s*(\d{1,3})(?:[.,](\d+))?/, // %15, %12,5
    /(\d{1,3})(?:[.,](\d+))?\s*%/, // 15%
    /yuzde\s*(\d{1,3})(?:[.,](\d+))?/, // yüzde 20
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const percent = Number.parseInt(match[1], 10);
    if (Number.isNaN(percent) || percent <= 0 || percent > 100) continue;
    return percent;
  }

  return null;
}

function lettersFromName(brandName: string): string {
  return foldTurkish(brandName)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function initialsFromName(brandName: string): string {
  return foldTurkish(brandName)
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z0-9]/g, "").charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join("");
}

function randomChars(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => MEMBER_CODE_ALPHABET[byte % MEMBER_CODE_ALPHABET.length]).join("");
}

/**
 * The code we'd suggest for a brand: rate-based when `discount_info` states
 * one (%10 -> EYB10), otherwise built from the brand's name
 * ("Şişli Çiçek" -> EYBSISL) so it still means something at the till.
 */
export function buildDiscountCode(brandName: string, discountInfo?: string | null): string {
  const percent = parseDiscountPercent(discountInfo);
  if (percent !== null) return `${CODE_PREFIX}${percent}`;

  const letters = lettersFromName(brandName).slice(0, 4);
  if (letters) return `${CODE_PREFIX}${letters}`;

  return `${CODE_PREFIX}${randomChars(4)}`;
}

/**
 * Same as `buildDiscountCode`, but guaranteed not to clash with `takenCodes`
 * (compared case-insensitively): a second brand giving %10 gets its initials
 * appended (EYB10TK), and if that is taken too a numeric suffix (EYB10-2).
 */
export function makeUniqueDiscountCode(
  brandName: string,
  discountInfo: string | null | undefined,
  takenCodes: Array<string | null | undefined>,
): string {
  const taken = new Set(
    takenCodes.filter((code): code is string => Boolean(code)).map((code) => code.trim().toUpperCase()),
  );
  const isFree = (candidate: string) => candidate.length > 0 && !taken.has(candidate.toUpperCase());

  const base = buildDiscountCode(brandName, discountInfo);
  if (isFree(base)) return base;

  const withInitials = `${base}${initialsFromName(brandName)}`;
  if (withInitials !== base && isFree(withInitials)) return withInitials;

  for (let suffix = 2; suffix <= 99; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (isFree(candidate)) return candidate;
  }

  // Pathological case (99 codes on the same base) - fall back to randomness.
  let candidate = `${base}-${randomChars(4)}`;
  while (!isFree(candidate)) candidate = `${base}-${randomChars(4)}`;
  return candidate;
}

/** Cleans a hand-typed code: no spaces, upper case, only A-Z 0-9 and dashes. */
export function normalizeDiscountCode(input: string | null | undefined): string {
  if (!input) return "";
  return foldTurkish(input).toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/** Derives a member's personal single-use code from a campaign code. */
export function buildMemberCode(campaignCode: string, suffixLength = 6): string {
  const base = normalizeDiscountCode(campaignCode) || CODE_PREFIX;
  return `${base}-${randomChars(suffixLength)}`;
}

export interface CodeWindow {
  is_active?: boolean | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

/** True when a code is active and `now` falls inside its validity window. */
export function isCodeUsable(window: CodeWindow, now: Date = new Date()): boolean {
  if (window.is_active === false) return false;

  const time = now.getTime();
  if (window.valid_from) {
    const from = new Date(window.valid_from).getTime();
    if (!Number.isNaN(from) && time < from) return false;
  }
  if (window.valid_until) {
    const until = new Date(window.valid_until).getTime();
    if (!Number.isNaN(until) && time > until) return false;
  }
  return true;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Human-readable validity line for the brands page, "" when there are no dates. */
export function describeCodeWindow(window: CodeWindow, now: Date = new Date()): string {
  const { valid_from: from, valid_until: until } = window;

  if (until && new Date(until).getTime() < now.getTime()) {
    return `${formatDate(until)} tarihinde süresi doldu`;
  }
  if (from && new Date(from).getTime() > now.getTime()) {
    return until
      ? `${formatDate(from)} - ${formatDate(until)} arasında geçerli`
      : `${formatDate(from)} tarihinden itibaren geçerli`;
  }
  if (until) return `${formatDate(until)} tarihine kadar geçerli`;
  return "";
}

/**
 * When a member's single-use code should expire: the campaign's own end date
 * if it ends sooner, otherwise DEFAULT_MEMBER_CODE_DAYS from now.
 */
export function computeMemberCodeExpiry(validUntil: string | null | undefined, now: Date = new Date()): Date {
  const fallback = new Date(now.getTime() + DEFAULT_MEMBER_CODE_DAYS * 24 * 60 * 60 * 1000);
  if (!validUntil) return fallback;

  const until = new Date(validUntil);
  if (Number.isNaN(until.getTime())) return fallback;
  return until.getTime() < fallback.getTime() ? until : fallback;
}

/**
 * True when a new redemption arriving `now` is close enough to the member's
 * previous one on the same code to be an accidental duplicate.
 */
export function isDuplicateRedemption(
  lastRedeemedAt: string | null | undefined,
  now: Date = new Date(),
  windowMs: number = DUPLICATE_REDEMPTION_WINDOW_MS,
): boolean {
  if (!lastRedeemedAt) return false;

  const last = new Date(lastRedeemedAt).getTime();
  if (Number.isNaN(last)) return false;
  return now.getTime() - last < windowMs;
}
