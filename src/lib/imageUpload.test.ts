import { describe, expect, it } from "vitest";
import {
  ALLOWED_LOGO_TYPES,
  buildLogoObjectPath,
  isManagedLogoUrl,
  LOGO_ACCEPT_ATTRIBUTE,
  logoObjectPathFromUrl,
  MAX_LOGO_BYTES,
  slugifyBrandName,
  validateLogoFile,
} from "./imageUpload";

const PUBLIC_BASE = "https://hphimagmntysakwhwdss.supabase.co/storage/v1/object/public/brand-logos/";

describe("validateLogoFile", () => {
  it("accepts every format the bucket allows", () => {
    for (const type of Object.keys(ALLOWED_LOGO_TYPES)) {
      expect(validateLogoFile({ type, size: 1024 })).toEqual({ ok: true });
    }
  });

  it("tolerates an upper-case mime type", () => {
    expect(validateLogoFile({ type: "IMAGE/PNG", size: 1024 })).toEqual({ ok: true });
  });

  it("explains HEIC rather than calling it unsupported", () => {
    const result = validateLogoFile({ type: "image/heic", size: 1024 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("tarayıcılar gösteremiyor");
  });

  it("explains why SVG is refused", () => {
    const result = validateLogoFile({ type: "image/svg+xml", size: 1024 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("güvenlik");
  });

  it("names the accepted formats for anything else", () => {
    const result = validateLogoFile({ type: "application/zip", size: 1024 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("PNG, JPEG, WebP, AVIF, GIF");
  });

  it("rejects a file with no type at all", () => {
    expect(validateLogoFile({ type: "", size: 1024 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateLogoFile({ type: "image/png", size: 0 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("boş");
  });

  it("rejects a file over the limit and states both sizes", () => {
    const result = validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("2 MB");
  });

  it("accepts a file exactly on the limit", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES })).toEqual({ ok: true });
  });

  it("checks the type before the size, so a huge HEIC explains the format", () => {
    const result = validateLogoFile({ type: "image/heic", size: MAX_LOGO_BYTES * 10 });
    expect(result.message).toContain("HEIC");
  });
});

describe("slugifyBrandName", () => {
  it("folds Turkish letters and joins words with dashes", () => {
    expect(slugifyBrandName("Şişli Çiçek")).toBe("sisli-cicek");
    expect(slugifyBrandName("Ünlü Güneş Gözlükleri")).toBe("unlu-gunes-gozlukleri");
  });

  it("drops punctuation instead of leaving dashes at the edges", () => {
    expect(slugifyBrandName("  ...Test Kafe!!  ")).toBe("test-kafe");
  });

  it("falls back to a placeholder when nothing usable is left", () => {
    expect(slugifyBrandName("!!!")).toBe("marka");
    expect(slugifyBrandName("")).toBe("marka");
  });

  it("truncates without leaving a trailing dash", () => {
    const slug = slugifyBrandName("a".repeat(30) + " " + "b".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("buildLogoObjectPath", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("takes the extension from the mime type, not the file name", () => {
    expect(buildLogoObjectPath("Test Kafe", "image/jpeg", now)).toMatch(
      /^test-kafe\/1788868800000-[a-z0-9]{6}\.jpg$/,
    );
    expect(buildLogoObjectPath("Test Kafe", "image/png", now)).toMatch(/\.png$/);
    expect(buildLogoObjectPath("Test Kafe", "image/webp", now)).toMatch(/\.webp$/);
  });

  it("does not collide within the same millisecond", () => {
    const paths = new Set(
      Array.from({ length: 50 }, () => buildLogoObjectPath("Test Kafe", "image/png", now)),
    );
    expect(paths.size).toBe(50);
  });
});

describe("logoObjectPathFromUrl", () => {
  it("extracts the object path from one of our public URLs", () => {
    expect(logoObjectPathFromUrl(`${PUBLIC_BASE}test-kafe/123-abcdef.png`)).toBe("test-kafe/123-abcdef.png");
  });

  it("ignores a cache-busting query string", () => {
    expect(logoObjectPathFromUrl(`${PUBLIC_BASE}test-kafe/123-abcdef.png?t=9`)).toBe("test-kafe/123-abcdef.png");
  });

  it("decodes a percent-encoded path", () => {
    expect(logoObjectPathFromUrl(`${PUBLIC_BASE}test%20kafe/123.png`)).toBe("test kafe/123.png");
  });

  it("returns null for a logo hosted elsewhere", () => {
    expect(logoObjectPathFromUrl("https://testkafe.com/logo.png")).toBeNull();
    expect(logoObjectPathFromUrl("")).toBeNull();
    expect(logoObjectPathFromUrl(null)).toBeNull();
  });

  it("returns null for another bucket on the same project", () => {
    expect(
      logoObjectPathFromUrl("https://x.supabase.co/storage/v1/object/public/avatars/a.png"),
    ).toBeNull();
  });
});

describe("isManagedLogoUrl", () => {
  it("only claims files we uploaded", () => {
    expect(isManagedLogoUrl(`${PUBLIC_BASE}a/b.png`)).toBe(true);
    expect(isManagedLogoUrl("https://testkafe.com/logo.png")).toBe(false);
  });
});

describe("LOGO_ACCEPT_ATTRIBUTE", () => {
  it("lists exactly the allowed types for the file picker", () => {
    expect(LOGO_ACCEPT_ATTRIBUTE).toBe("image/png,image/jpeg,image/webp,image/avif,image/gif");
  });
});
