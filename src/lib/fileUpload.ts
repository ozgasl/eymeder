// What may be uploaded, and under what name.
//
// Three upload paths exist: brand logos (admin panel), gallery media (members)
// and profile avatars. Each writes to its own Supabase Storage bucket, and each
// bucket carries the same type and size limits declared here — the bucket is
// what actually enforces them, because every upload runs from the client and
// could be made directly against storage, skipping any form. This module's job
// is to explain a rejection in Turkish before the user meets a raw 413, and to
// name the stored object safely.

import { foldTurkish } from "./discountCode";

const MB = 1024 * 1024;

/** Image types every image upload accepts, mapped to the extension we store. */
export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

/**
 * Video types the gallery accepts. quicktime is here because .mov is what an
 * iPhone hands over; note that an HEVC-encoded .mp4 still reports video/mp4
 * and may not play in every browser — the container is all a MIME type tells us.
 */
export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;

export interface UploadPreset {
  bucket: string;
  maxBytes: number;
  /** MIME type -> the extension the object is stored under. */
  allowedTypes: Record<string, string>;
  /** Human-readable format list for help text and error messages. */
  formatLabel: string;
  /**
   * Shown when the file is a valid media file of the OTHER kind. Only set on
   * presets that come in a photo/video pair: telling someone uploading a brand
   * logo to "pick Video instead" would point at an option that isn't there.
   */
  wrongKindMessage?: string;
}

export const IMAGE_FORMAT_LABEL = "PNG, JPEG, WebP, AVIF, GIF";
export const VIDEO_FORMAT_LABEL = "MP4, WebM, MOV";

export const BRAND_LOGO_UPLOAD: UploadPreset = {
  bucket: "brand-logos",
  maxBytes: 2 * MB,
  allowedTypes: IMAGE_TYPES,
  formatLabel: IMAGE_FORMAT_LABEL,
};

export const AVATAR_UPLOAD: UploadPreset = {
  bucket: "avatars",
  // Larger than a logo: this is a photo off someone's phone and we don't resize it.
  maxBytes: 5 * MB,
  allowedTypes: IMAGE_TYPES,
  formatLabel: IMAGE_FORMAT_LABEL,
};

export const GALLERY_PHOTO_UPLOAD: UploadPreset = {
  bucket: "media",
  maxBytes: 10 * MB,
  allowedTypes: IMAGE_TYPES,
  formatLabel: IMAGE_FORMAT_LABEL,
  wrongKindMessage: "Bu bir video dosyası. Video yüklemek için tür olarak Video'yu seçin.",
};

export const GALLERY_VIDEO_UPLOAD: UploadPreset = {
  bucket: "media",
  // Supabase also enforces a project-wide upload limit; if that is lower than
  // this, the project limit is what applies.
  maxBytes: 50 * MB,
  allowedTypes: VIDEO_TYPES,
  formatLabel: VIDEO_FORMAT_LABEL,
  wrongKindMessage: "Bu bir görsel dosyası. Tür olarak Fotoğraf'ı seçin.",
};

// Types worth explaining individually, because "unsupported format" would send
// the user looking for the wrong fix.
const EXPLAINED_REJECTIONS: Record<string, string> = {
  "image/heic":
    "HEIC dosyalarını tarayıcılar gösteremiyor. Telefonunuzdan PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "image/heif":
    "HEIF dosyalarını tarayıcılar gösteremiyor. PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "image/svg+xml":
    "SVG dosyaları güvenlik nedeniyle kabul edilmiyor. Görseli PNG olarak dışa aktarıp yükleyin.",
  "image/tiff":
    "TIFF dosyalarını tarayıcılar gösteremiyor. PNG veya JPEG olarak kaydedip tekrar deneyin.",
  "application/pdf":
    "PDF bir görsel dosyası değil. Görseli PNG veya JPEG olarak dışa aktarıp yükleyin.",
};

export interface UploadFileLike {
  type: string;
  size: number;
}

export interface UploadValidation {
  ok: boolean;
  /** Set when `ok` is false: what to show the user. */
  message?: string;
}

function formatSize(bytes: number): string {
  const mb = bytes / MB;
  return `${mb.toFixed(Number.isInteger(mb) ? 0 : 1)} MB`;
}

/**
 * Whether a picked file may be uploaded under `preset`. The type is checked
 * before the size: told only "too large", someone shrinks a HEIC that was never
 * going to display in the first place.
 */
export function validateUpload(file: UploadFileLike, preset: UploadPreset): UploadValidation {
  const type = file.type?.toLowerCase() ?? "";

  if (!(type in preset.allowedTypes)) {
    // A supported file of the other kind means the form's type selector is
    // wrong, not that the file is unusable — but only where that selector
    // exists (see wrongKindMessage).
    const isKnownMedia = type in IMAGE_TYPES || type in VIDEO_TYPES;
    if (isKnownMedia && preset.wrongKindMessage) {
      return { ok: false, message: preset.wrongKindMessage };
    }

    return {
      ok: false,
      message:
        EXPLAINED_REJECTIONS[type] ??
        `Bu dosya türü desteklenmiyor. Kabul edilen formatlar: ${preset.formatLabel}.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "Dosya boş görünüyor, başka bir dosya seçin." };
  }

  if (file.size > preset.maxBytes) {
    return {
      ok: false,
      message: `Dosya çok büyük (${formatSize(file.size)}). En fazla ${formatSize(preset.maxBytes)} olabilir.`,
    };
  }

  return { ok: true };
}

/** The `accept` attribute for a file picker limited to this preset. */
export function acceptAttribute(preset: UploadPreset): string {
  return Object.keys(preset.allowedTypes).join(",");
}

const OBJECT_NAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => OBJECT_NAME_ALPHABET[byte % OBJECT_NAME_ALPHABET.length]).join("");
}

/** Folder-safe slug of a name: "Şişli Çiçek" -> "sisli-cicek". */
export function slugifyForPath(input: string, fallback = "dosya"): string {
  const slug = foldTurkish(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return slug || fallback;
}

/**
 * Path to store an upload under, inside `prefix` (a brand slug, a user id).
 * The extension comes from the MIME type, never from `file.name`: the
 * browser-reported name is attacker-controlled, and a mismatched extension is
 * how a public bucket ends up serving the wrong content type.
 */
export function buildObjectPath(
  prefix: string,
  type: string,
  preset: UploadPreset,
  now: Date = new Date(),
): string {
  const extension = preset.allowedTypes[type.toLowerCase()] ?? "bin";
  return `${prefix}/${now.getTime()}-${randomSuffix()}.${extension}`;
}

/**
 * The object path inside a preset's bucket for a stored public URL, or null
 * when the URL points somewhere else — a logo hosted on a brand's own site
 * must never have a file deleted on its behalf.
 */
export function objectPathFromUrl(url: string | null | undefined, preset: UploadPreset): string | null {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${preset.bucket}/`;
  const markerAt = url.indexOf(marker);
  if (markerAt === -1) return null;

  const path = url.slice(markerAt + marker.length).split("?")[0];
  if (!path) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** True when this URL is a file we uploaded to the preset's bucket. */
export function isManagedUrl(url: string | null | undefined, preset: UploadPreset): boolean {
  return objectPathFromUrl(url, preset) !== null;
}
