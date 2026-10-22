import { describe, it, expect } from "vitest";
import { normalizePlace } from "./placeNormalize";

describe("normalizePlace", () => {
  it("collapses the İstanbul spellings seen in production", () => {
    const spellings = ["İstanbul", "istanbul", "Istanbul", "ISTANBUL", "İSTANBUL", " İstanbul "];
    for (const s of spellings) expect(normalizePlace(s)).toBe("istanbul");
  });

  it("treats HATAY and Hatay the same", () => {
    expect(normalizePlace("HATAY")).toBe(normalizePlace("Hatay"));
  });

  it("folds Turkish letters to ASCII", () => {
    expect(normalizePlace("Şanlıurfa")).toBe("sanliurfa");
    expect(normalizePlace("Tekirdağ")).toBe("tekirdag");
    expect(normalizePlace("Kahramanmaraş")).toBe("kahramanmaras");
    expect(normalizePlace("Eskişehir")).toBe("eskisehir");
  });

  it("squeezes inner whitespace", () => {
    expect(normalizePlace("New   York")).toBe("new york");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizePlace(null)).toBe("");
    expect(normalizePlace(undefined)).toBe("");
    expect(normalizePlace("   ")).toBe("");
  });
});
