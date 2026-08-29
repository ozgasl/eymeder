import { describe, it, expect } from "vitest";
import { buildFonzipMembershipNo } from "./fonzipMembershipNo";

describe("buildFonzipMembershipNo", () => {
  it("zero-pads a short school number to 4 digits", () => {
    expect(buildFonzipMembershipNo(2026, "18")).toBe(20260018);
  });

  it("passes through a 4-digit school number unchanged", () => {
    expect(buildFonzipMembershipNo(2026, "2262")).toBe(20262262);
  });

  it("matches real observed Fonzip membership numbers", () => {
    expect(buildFonzipMembershipNo(2025, "737")).toBe(20250737);
    expect(buildFonzipMembershipNo(2025, "614")).toBe(20250614);
  });

  it("strips non-digit characters from the school number before padding", () => {
    expect(buildFonzipMembershipNo(2026, " 18 ")).toBe(20260018);
  });

  it("returns null when the school number has more than 4 digits", () => {
    expect(buildFonzipMembershipNo(2026, "12345")).toBeNull();
  });

  it("returns null when the school number is empty", () => {
    expect(buildFonzipMembershipNo(2026, "")).toBeNull();
  });

  it("returns null when the graduation year isn't 4 digits", () => {
    expect(buildFonzipMembershipNo(202, "18")).toBeNull();
  });
});
