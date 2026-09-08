// Brand logo uploads.
//
// `brands.logo_url` holds a URL either way — a file uploaded to the
// `brand-logos` bucket (see 20260908190000_brand_logos_bucket.sql) or an
// address an admin pasted. These helpers decide what may be uploaded, name the
// stored object, and recognise our own URLs so a replaced logo can be cleaned
// up without touching a brand whose logo lives on its own site.
//
// The same limits are set on the bucket. This is the friendly half: it explains
// the rejection in the form instead of letting Supabase answer with a 413.

import { foldTurkish } from "./discountCode";

export const LOGO_BUCKET = "brand-logos";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Accepted types, mapped to the extension we store the file under. */
export const ALLOWED_LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type AllowedLogoType = keyof typeof ALLOWED_LOGO_TYPES;

/** For the file picker's `accept` attribute. */
export const LOGO_ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_LOGO_TYPES).join(",");

/** "PNG, JPEG, WebP, AVIF, GIF" — for form help text and error messages. */
export const LOGO_FORMAT_LABEL = "PNG, JPEG, WebP, AVIF, GIF";

// Types worth explaining individually, because "unsupported format" would send
// the admin looking for the wrong fix.
const EXPLAINED_REJECTIONS: Record<string, string> = {
  "image/heic":
    "HEIC dosyalarını tarayıcılar gösteremiyor. Telefonunuzdan PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "image/heif":
    "HEIF dosyalarını tarayıcılar gösteremiyor. PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "image/svg+xml":
    "SVG dosyaları güvenlik nedeniyle kabul edilmiyor. Logoyu PNG olarak dışa aktarıp yükleyin.",
  "image/tiff":
    "TIFF dosyalarını tarayıcılar gösteremiyor. PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "application/pdf":
    "PDF bir görsel dosyası değil. Logoyu PNG veya JPEG olarak dışa aktarıp yükleyin.",
};

export interface LogoFileLike {
  type: string;
  size: number;
}

export interface LogoValidation {
  ok: boolean;
  /** Set when `ok` is false: what to show the admin. */
  message?: string;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}

/**
 * Whether a picked file may be uploaded as a brand logo. The type is checked
 * before the size: told "too large", an admin shrinks a HEIC that was never
 * going to display in the first place.
 */
export function validateLogoFile(file: LogoFileLike): LogoValidation {
  const type = file.type?.toLowerCase() ?? "";

  if (!(type in ALLOWED_LOGO_TYPES)) {
    const explained = EXPLAINED_REJECTIONS[type];
    return {
      ok: false,
      message: explained ?? `Bu dosya türü desteklenmiyor. Kabul edilen formatlar: ${LOGO_FORMAT_LABEL}.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "Dosya boş görünüyor, başka bir dosya seçin." };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      message: `Dosya çok büyük (${formatMegabytes(file.size)}). En fazla ${formatMegabytes(MAX_LOGO_BYTES)} olabilir.`,
    };
  }

  return { ok: true };
}

const OBJECT_NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => OBJECT_NAME_ALPHABET[byte % OBJECT_NAME_ALPHABET.length]).join("");
}

/** Folder-safe slug of a brand name: "Şişli Çiçek" -> "sisli-cicek". */
export function slugifyBrandName(brandName: string): string {
  const slug = foldTurkish(brandName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return slug || "marka";
}

/**
 * Path to store an upload under. The extension comes from the MIME type, never
 * from `file.name`: the browser-reported name is attacker-controlled and a
 * mismatched extension is how a public bucket ends up serving the wrong
 * content type.
 */
export function buildLogoObjectPath(brandName: string, type: AllowedLogoType, now: Date = new Date()): string {
  const extension = ALLOWED_LOGO_TYPES[type];
  return `${slugifyBrandName(brandName)}/${now.getTime()}-${randomSuffix()}.${extension}`;
}

const PUBLIC_URL_MARKER = `/storage/v1/object/public/${LOGO_BUCKET}/`;

/**
 * The object path inside our bucket for a stored logo URL, or null when the URL
 * points somewhere else — a brand hosting its own logo must never have a file
 * deleted on its behalf.
 */
export function logoObjectPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const markerAt = url.indexOf(PUBLIC_URL_MARKER);
  if (markerAt === -1) return null;

  const path = url.slice(markerAt + PUBLIC_URL_MARKER.length).split("?")[0];
  if (!path) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** True when this logo URL is a file we uploaded and may clean up. */
export function isManagedLogoUrl(url: string | null | undefined): boolean {
  return logoObjectPathFromUrl(url) !== null;
}
