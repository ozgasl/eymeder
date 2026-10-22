import { describe, it, expect } from "vitest";
import { TURKISH_CITIES, canonicalTurkishCity } from "./turkishCities";

describe("TURKISH_CITIES", () => {
  it("lists the 81 provinces once each", () => {
    expect(TURKISH_CITIES).toHaveLength(81);
    expect(new Set(TURKISH_CITIES).size).toBe(81);
  });
});

describe("canonicalTurkishCity", () => {
  it("fixes the spellings seen in production", () => {
    for (const s of ["İstanbul", "istanbul", "Istanbul", "ISTANBUL"]) {
      expect(canonicalTurkishCity(s)).toBe("İstanbul");
    }
    expect(canonicalTurkishCity("HATAY")).toBe("Hatay");
    expect(canonicalTurkishCity("Izmir")).toBe("İzmir");
    expect(canonicalTurkishCity("tekirdağ")).toBe("Tekirdağ");
    expect(canonicalTurkishCity("Hakkari")).toBe("Hakkâri");
  });

  it("maps short forms", () => {
    expect(canonicalTurkishCity("Afyon")).toBe("Afyonkarahisar");
    expect(canonicalTurkishCity("Maraş")).toBe("Kahramanmaraş");
    expect(canonicalTurkishCity("Urfa")).toBe("Şanlıurfa");
  });

  it("returns null for districts, foreign cities and empty input", () => {
    expect(canonicalTurkishCity("Kadıköy")).toBeNull();
    expect(canonicalTurkishCity("Brüksel")).toBeNull();
    expect(canonicalTurkishCity("")).toBeNull();
    expect(canonicalTurkishCity(undefined)).toBeNull();
  });
});
