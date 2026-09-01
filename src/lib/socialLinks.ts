// Profile social fields are stored as full URLs (column names end in `_url`
// and directory.tsx uses them directly as href), but members only want to
// type/see their handle. These helpers convert between the two: build a full
// URL from a handle for storage, and pull the handle back out of a stored
// URL for display/editing. Inputs that are already a full URL (existing
// rows, or a user who pastes one anyway) are passed through untouched by
// buildSocialUrl so old data keeps working.

type SocialPlatform = "linkedin" | "twitter" | "instagram" | "facebook";

const BASE_URLS: Record<SocialPlatform, string> = {
  linkedin: "https://linkedin.com/in/",
  twitter: "https://twitter.com/",
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
};

export function buildSocialUrl(platform: SocialPlatform, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  return `${BASE_URLS[platform]}${handle}`;
}

export function getSocialHandle(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const { pathname } = new URL(url);
    return pathname.replace(/^\/(in\/)?/, "").replace(/\/$/, "");
  } catch {
    // Not a valid URL (e.g. already just a bare handle) - use as-is.
    return url.replace(/^@/, "");
  }
}
