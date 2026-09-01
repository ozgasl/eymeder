import { describe, expect, it } from "vitest";
import { buildSocialUrl, getSocialHandle } from "./socialLinks";

describe("buildSocialUrl", () => {
  it("builds a full URL from a bare handle", () => {
    expect(buildSocialUrl("linkedin", "aysingun")).toBe("https://linkedin.com/in/aysingun");
    expect(buildSocialUrl("twitter", "aysingun")).toBe("https://twitter.com/aysingun");
    expect(buildSocialUrl("instagram", "aysingun")).toBe("https://instagram.com/aysingun");
    expect(buildSocialUrl("facebook", "aysingun")).toBe("https://facebook.com/aysingun");
  });

  it("strips a leading @", () => {
    expect(buildSocialUrl("instagram", "@aysingun")).toBe("https://instagram.com/aysingun");
  });

  it("passes an already-full URL through unchanged", () => {
    expect(buildSocialUrl("linkedin", "https://linkedin.com/in/aysingun")).toBe("https://linkedin.com/in/aysingun");
  });

  it("returns an empty string for empty input", () => {
    expect(buildSocialUrl("facebook", "  ")).toBe("");
  });
});

describe("getSocialHandle", () => {
  it("extracts the handle from a full URL", () => {
    expect(getSocialHandle("https://linkedin.com/in/aysingun")).toBe("aysingun");
    expect(getSocialHandle("https://twitter.com/aysingun")).toBe("aysingun");
  });

  it("passes a bare handle through", () => {
    expect(getSocialHandle("aysingun")).toBe("aysingun");
    expect(getSocialHandle("@aysingun")).toBe("aysingun");
  });

  it("returns an empty string for null/undefined", () => {
    expect(getSocialHandle(null)).toBe("");
    expect(getSocialHandle(undefined)).toBe("");
  });
});
