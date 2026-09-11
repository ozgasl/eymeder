import { describe, expect, it } from "vitest";
import {
  acceptAttribute,
  AVATAR_UPLOAD,
  BRAND_LOGO_UPLOAD,
  buildObjectPath,
  describeStorageFailure,
  GALLERY_PHOTO_UPLOAD,
  GALLERY_VIDEO_UPLOAD,
  IMAGE_TYPES,
  isManagedUrl,
  objectPathFromUrl,
  slugifyForPath,
  validateUpload,
  VIDEO_TYPES,
} from "./fileUpload";

const MB = 1024 * 1024;
const publicBase = (bucket: string) =>
  `https://hphimagmntysakwhwdss.supabase.co/storage/v1/object/public/${bucket}/`;

describe("validateUpload — image presets", () => {
  for (const preset of [BRAND_LOGO_UPLOAD, AVATAR_UPLOAD, GALLERY_PHOTO_UPLOAD]) {
    it(`accepts every image format for the ${preset.bucket} bucket`, () => {
      for (const type of Object.keys(IMAGE_TYPES)) {
        expect(validateUpload({ type, size: 1024 }, preset)).toEqual({ ok: true });
      }
    });
  }

  it("tolerates an upper-case mime type", () => {
    expect(validateUpload({ type: "IMAGE/PNG", size: 1024 }, AVATAR_UPLOAD)).toEqual({ ok: true });
  });

  it("explains HEIC rather than calling it unsupported", () => {
    const result = validateUpload({ type: "image/heic", size: 1024 }, AVATAR_UPLOAD);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("tarayıcılar gösteremiyor");
  });

  it("explains why SVG is refused", () => {
    expect(validateUpload({ type: "image/svg+xml", size: 1024 }, BRAND_LOGO_UPLOAD).message).toContain(
      "güvenlik",
    );
  });

  it("names the accepted formats for anything else", () => {
    expect(validateUpload({ type: "application/zip", size: 1024 }, GALLERY_PHOTO_UPLOAD).message).toContain(
      "PNG, JPEG, WebP, AVIF, GIF",
    );
  });

  it("rejects a file with no type at all", () => {
    expect(validateUpload({ type: "", size: 1024 }, AVATAR_UPLOAD).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateUpload({ type: "image/png", size: 0 }, AVATAR_UPLOAD).message).toContain("boş");
  });
});

describe("validateUpload — sizes are per preset", () => {
  it("holds a logo to 2 MB", () => {
    expect(validateUpload({ type: "image/png", size: 2 * MB }, BRAND_LOGO_UPLOAD)).toEqual({ ok: true });
    expect(validateUpload({ type: "image/png", size: 2 * MB + 1 }, BRAND_LOGO_UPLOAD).message).toContain("2 MB");
  });

  it("allows an avatar the logo limit would refuse", () => {
    expect(validateUpload({ type: "image/jpeg", size: 4 * MB }, BRAND_LOGO_UPLOAD).ok).toBe(false);
    expect(validateUpload({ type: "image/jpeg", size: 4 * MB }, AVATAR_UPLOAD)).toEqual({ ok: true });
  });

  it("holds a gallery photo to 10 MB and a gallery video to 50 MB", () => {
    expect(validateUpload({ type: "image/jpeg", size: 11 * MB }, GALLERY_PHOTO_UPLOAD).message).toContain("10 MB");
    expect(validateUpload({ type: "video/mp4", size: 40 * MB }, GALLERY_VIDEO_UPLOAD)).toEqual({ ok: true });
    expect(validateUpload({ type: "video/mp4", size: 51 * MB }, GALLERY_VIDEO_UPLOAD).message).toContain("50 MB");
  });

  it("reports the offending size as well as the limit", () => {
    expect(validateUpload({ type: "image/png", size: 3.5 * MB }, BRAND_LOGO_UPLOAD).message).toContain("3.5 MB");
  });

  it("checks the type before the size, so a huge HEIC explains the format", () => {
    expect(validateUpload({ type: "image/heic", size: 100 * MB }, AVATAR_UPLOAD).message).toContain("HEIC");
  });
});

describe("validateUpload — picking the wrong kind in the gallery", () => {
  it("tells a member who picked a video that the type selector is wrong", () => {
    const result = validateUpload({ type: "video/mp4", size: 5 * MB }, GALLERY_PHOTO_UPLOAD);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Video'yu seçin");
  });

  it("tells a member who picked a photo the same way round", () => {
    const result = validateUpload({ type: "image/png", size: 1024 }, GALLERY_VIDEO_UPLOAD);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Fotoğraf'ı seçin");
  });

  it("does not offer a type selector that does not exist for a brand logo", () => {
    const result = validateUpload({ type: "video/mp4", size: 1024 }, BRAND_LOGO_UPLOAD);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("PNG, JPEG, WebP, AVIF, GIF");
    expect(result.message).not.toContain("seçin");
  });

  it("accepts every video format the gallery allows", () => {
    for (const type of Object.keys(VIDEO_TYPES)) {
      expect(validateUpload({ type, size: 5 * MB }, GALLERY_VIDEO_UPLOAD)).toEqual({ ok: true });
    }
  });
});

describe("acceptAttribute", () => {
  it("lists exactly the preset's types", () => {
    expect(acceptAttribute(BRAND_LOGO_UPLOAD)).toBe("image/png,image/jpeg,image/webp,image/avif,image/gif");
    expect(acceptAttribute(GALLERY_VIDEO_UPLOAD)).toBe("video/mp4,video/webm,video/quicktime");
  });
});

describe("slugifyForPath", () => {
  it("folds Turkish letters and joins words with dashes", () => {
    expect(slugifyForPath("Şişli Çiçek")).toBe("sisli-cicek");
    expect(slugifyForPath("Ünlü Güneş Gözlükleri")).toBe("unlu-gunes-gozlukleri");
  });

  it("drops punctuation instead of leaving dashes at the edges", () => {
    expect(slugifyForPath("  ...Test Kafe!!  ")).toBe("test-kafe");
  });

  it("falls back when nothing usable is left", () => {
    expect(slugifyForPath("!!!")).toBe("dosya");
    expect(slugifyForPath("", "marka")).toBe("marka");
  });

  it("truncates without leaving a trailing dash", () => {
    const slug = slugifyForPath("a".repeat(30) + " " + "b".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("buildObjectPath", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("takes the extension from the mime type, not the file name", () => {
    expect(buildObjectPath("test-kafe", "image/jpeg", BRAND_LOGO_UPLOAD, now)).toMatch(
      /^test-kafe\/1788868800000-[a-z0-9]{6}\.jpg$/,
    );
    expect(buildObjectPath("u1", "video/quicktime", GALLERY_VIDEO_UPLOAD, now)).toMatch(/\.mov$/);
    expect(buildObjectPath("u1", "IMAGE/WEBP", GALLERY_PHOTO_UPLOAD, now)).toMatch(/\.webp$/);
  });

  it("does not collide within the same millisecond", () => {
    const paths = new Set(
      Array.from({ length: 50 }, () => buildObjectPath("u1", "image/png", AVATAR_UPLOAD, now)),
    );
    expect(paths.size).toBe(50);
  });
});

describe("objectPathFromUrl", () => {
  it("extracts the object path from one of our public URLs", () => {
    expect(objectPathFromUrl(`${publicBase("brand-logos")}test-kafe/123-abcdef.png`, BRAND_LOGO_UPLOAD)).toBe(
      "test-kafe/123-abcdef.png",
    );
  });

  it("ignores a cache-busting query string", () => {
    expect(objectPathFromUrl(`${publicBase("media")}u1/123.mp4?t=9`, GALLERY_VIDEO_UPLOAD)).toBe("u1/123.mp4");
  });

  it("decodes a percent-encoded path", () => {
    expect(objectPathFromUrl(`${publicBase("avatars")}u%201/123.png`, AVATAR_UPLOAD)).toBe("u 1/123.png");
  });

  it("does not claim a file in another bucket", () => {
    expect(objectPathFromUrl(`${publicBase("avatars")}u1/a.png`, BRAND_LOGO_UPLOAD)).toBeNull();
    expect(objectPathFromUrl(`${publicBase("brand-logos")}a/b.png`, AVATAR_UPLOAD)).toBeNull();
  });

  it("returns null for a file hosted elsewhere", () => {
    expect(objectPathFromUrl("https://testkafe.com/logo.png", BRAND_LOGO_UPLOAD)).toBeNull();
    expect(objectPathFromUrl("", BRAND_LOGO_UPLOAD)).toBeNull();
    expect(objectPathFromUrl(null, BRAND_LOGO_UPLOAD)).toBeNull();
  });
});

describe("isManagedUrl", () => {
  it("only claims files we uploaded to that bucket", () => {
    expect(isManagedUrl(`${publicBase("brand-logos")}a/b.png`, BRAND_LOGO_UPLOAD)).toBe(true);
    expect(isManagedUrl("https://testkafe.com/logo.png", BRAND_LOGO_UPLOAD)).toBe(false);
  });
});

describe("preset limits match the bucket migration", () => {
  // 20260908190000_brand_logos_bucket.sql and
  // 20260908200000_avatars_media_bucket_limits.sql hard-code these numbers.
  it("keeps the documented byte limits", () => {
    expect(BRAND_LOGO_UPLOAD.maxBytes).toBe(2097152);
    expect(AVATAR_UPLOAD.maxBytes).toBe(5242880);
    expect(GALLERY_VIDEO_UPLOAD.maxBytes).toBe(52428800);
  });

  it("shares one bucket between gallery photos and videos", () => {
    expect(GALLERY_PHOTO_UPLOAD.bucket).toBe("media");
    expect(GALLERY_VIDEO_UPLOAD.bucket).toBe("media");
  });
});

describe("describeStorageFailure", () => {
  it("says the upload was refused by storage, not by the table", () => {
    const message = describeStorageFailure("media", {
      message: "new row violates row-level security policy",
    });

    expect(message).toContain("media");
    expect(message).toContain("depolama");
    // The original sentence stays readable, so the real error is not hidden.
    expect(message).toContain("new row violates row-level security policy");
  });

  it("names a missing bucket as a missing bucket", () => {
    expect(describeStorageFailure("media", { message: "Bucket not found" }))
      .toContain("kovası bulunamadı");
  });

  it("separates the size limit from the type limit", () => {
    expect(
      describeStorageFailure("media", {
        message: "The object exceeded the maximum allowed size",
      }),
    ).toContain("boyut sınırını");

    expect(describeStorageFailure("media", { message: "invalid_mime_type" }))
      .toContain("türü");
  });

  it("still produces a message when the error carries none", () => {
    expect(describeStorageFailure("avatars", null)).toContain("avatars");
    expect(describeStorageFailure("avatars", { message: "  " })).toContain("yüklenemedi");
  });

  it("passes an unrecognised error through", () => {
    expect(describeStorageFailure("avatars", { message: "network error" }))
      .toContain("network error");
  });
});
