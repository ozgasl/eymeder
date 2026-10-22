import { describe, it, expect } from "vitest";
import { COUNTRIES, COUNTRY_NAMES, canonicalCountry } from "./countries";

describe("COUNTRIES", () => {
  it("has unique names and codes, Türkiye first", () => {
    expect(new Set(COUNTRY_NAMES).size).toBe(COUNTRY_NAMES.length);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(COUNTRIES[0]).toEqual({ code: "TR", name: "Türkiye" });
  });

  it("covers the world, not just a handful", () => {
    expect(COUNTRIES.length).toBeGreaterThan(230);
  });

  it("keeps the short names members already use", () => {
    expect(COUNTRY_NAMES).toContain("ABD");
    expect(COUNTRY_NAMES).toContain("İngiltere");
    expect(COUNTRY_NAMES).toContain("Hollanda");
  });

  it("has no catch-all 'Diğer' (it cannot be counted as a country)", () => {
    expect(COUNTRY_NAMES).not.toContain("Diğer");
  });

  it("includes the countries of the members currently in the 'Diğer' bucket", () => {
    for (const name of ["Belçika", "Güney Afrika", "Yunanistan", "Kuzey Kıbrıs (KKTC)"]) {
      expect(COUNTRY_NAMES).toContain(name);
    }
  });
});

describe("canonicalCountry", () => {
  it("matches regardless of case and Turkish letters", () => {
    expect(canonicalCountry("TÜRKİYE")).toBe("Türkiye");
    expect(canonicalCountry("turkiye")).toBe("Türkiye");
    expect(canonicalCountry(" hollanda ")).toBe("Hollanda");
  });

  it("maps common aliases", () => {
    expect(canonicalCountry("Turkey")).toBe("Türkiye");
    expect(canonicalCountry("USA")).toBe("ABD");
    expect(canonicalCountry("United Kingdom")).toBe("İngiltere");
    expect(canonicalCountry("KKTC")).toBe("Kuzey Kıbrıs (KKTC)");
  });

  it("returns null for 'Diğer', empty and unknown input", () => {
    expect(canonicalCountry("Diğer")).toBeNull();
    expect(canonicalCountry("")).toBeNull();
    expect(canonicalCountry(null)).toBeNull();
    expect(canonicalCountry("Atlantis")).toBeNull();
  });
});
