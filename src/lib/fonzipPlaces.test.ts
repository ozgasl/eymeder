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
    expect(mapFonzipPlace("London", "Chelsea", "")).toEqual({ ok: false, value: "London" });
  });

  it("treats a country typed into the city box as a country", () => {
    expect(mapFonzipPlace("Turkiye", "Kadıköy", "")).toEqual({ ok: true, city: "İstanbul", country: "Türkiye" });
  });

  it("writes an abroad city only with a known country", () => {
    expect(mapFonzipPlace("Brüksel", "", "Belçika")).toEqual({ ok: true, city: "Brüksel", country: "Belçika" });
    expect(mapFonzipPlace("Brüksel", "", "")).toEqual({ ok: false, value: "Brüksel" });
  });

  it("reports junk and empty values", () => {
    expect(mapFonzipPlace("34", "", "")).toEqual({ ok: false, value: "34" });
    expect(mapFonzipPlace("NJ 07310, USA", "", "")).toEqual({ ok: false, value: "NJ 07310, USA" });
    expect(mapFonzipPlace("", "", "")).toEqual({ ok: false, value: "" });
  });
});
