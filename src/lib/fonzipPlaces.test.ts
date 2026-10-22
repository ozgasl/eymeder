import { describe, it, expect } from "vitest";
import { mapFonzipPlace } from "./fonzipPlaces";

describe("mapFonzipPlace", () => {
  it("canonicalizes the İstanbul spellings seen in Fonzip and sets Türkiye", () => {
    for (const city of ["İstanbul", "Istanbul", "İSTANBUL", "istanbul"]) {
      expect(mapFonzipPlace(city, "Kadıköy", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
    }
  });

  it("maps other provinces and spelling variants", () => {
    expect(mapFonzipPlace("Izmir", null, null)).toEqual({ ok: true, city: "İzmir", country: "Türkiye" });
    expect(mapFonzipPlace("Balıkesir", "", "")).toEqual({ ok: true, city: "Balıkesir", country: "Türkiye" });
  });

  it("reads an Istanbul district typed as the city", () => {
    expect(mapFonzipPlace("Kadıköy", "", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
  });

  it("falls back to the district only when the city is empty", () => {
    expect(mapFonzipPlace("", "Ataşehir", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
    expect(mapFonzipPlace("Durham", "", "")).toEqual({ ok: false, value: "Durham" });
  });

  it("treats a country typed into the city box as a country", () => {
    expect(mapFonzipPlace("Turkiye", "Kadıköy", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
  });

  it("writes an abroad city only with a known country", () => {
    expect(mapFonzipPlace("Brüksel", "", "Belçika")).toEqual({ ok: true, city: "Brüksel", country: "Belçika" });
    expect(mapFonzipPlace("Vaud", "", "")).toEqual({ ok: false, value: "Vaud" });
  });

  it("reads a plate code typed as the city", () => {
    expect(mapFonzipPlace("34", "", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
    expect(mapFonzipPlace("6", "", "")).toEqual({ ok: true, city: "Ankara", country: "Türkiye" });
    expect(mapFonzipPlace("35", "", "")).toEqual({ ok: true, city: "İzmir", country: "Türkiye" });
    expect(mapFonzipPlace("81", "", "")).toEqual({ ok: true, city: "Düzce", country: "Türkiye" });
    expect(mapFonzipPlace("99", "", "")).toEqual({ ok: false, value: "99" });
  });

  it("knows a few unambiguous foreign cities", () => {
    expect(mapFonzipPlace("Brüksel", "", "")).toEqual({ ok: true, city: "Brüksel", country: "Belçika" });
    expect(mapFonzipPlace("London", "Chelsea", "")).toEqual({ ok: true, city: "Londra", country: "İngiltere" });
    expect(mapFonzipPlace("Girne", "", "")).toEqual({ ok: true, city: "Girne", country: "Kuzey Kıbrıs (KKTC)" });
  });

  it("reports junk and empty values", () => {
    expect(mapFonzipPlace("NJ 07310, USA", "", "")).toEqual({ ok: false, value: "NJ 07310, USA" });
    expect(mapFonzipPlace("", "", "")).toEqual({ ok: false, value: "" });
  });
});
