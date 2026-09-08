import { describe, expect, it } from "vitest";
import {
  buildDiscountCode,
  buildMemberCode,
  computeMemberCodeExpiry,
  describeCodeWindow,
  DUPLICATE_REDEMPTION_WINDOW_MS,
  foldTurkish,
  isCodeUsable,
  isDuplicateRedemption,
  makeUniqueDiscountCode,
  normalizeDiscountCode,
  parseDiscountPercent,
} from "./discountCode";

describe("parseDiscountPercent", () => {
  it("reads the usual Turkish phrasings", () => {
    expect(parseDiscountPercent("%15 indirim")).toBe(15);
    expect(parseDiscountPercent("Tüm ürünlerde %10")).toBe(10);
    expect(parseDiscountPercent("yüzde 20 indirim")).toBe(20);
    expect(parseDiscountPercent("% 25")).toBe(25);
  });

  it("reads the percent sign after the number", () => {
    expect(parseDiscountPercent("15% off")).toBe(15);
  });

  it("floors fractional rates", () => {
    expect(parseDiscountPercent("%12,5 indirim")).toBe(12);
  });

  it("returns null when there is no rate", () => {
    expect(parseDiscountPercent("1 alana 1 bedava")).toBeNull();
    expect(parseDiscountPercent("Ücretsiz kargo")).toBeNull();
    expect(parseDiscountPercent("")).toBeNull();
    expect(parseDiscountPercent(null)).toBeNull();
  });

  it("rejects out-of-range rates", () => {
    expect(parseDiscountPercent("%0 indirim")).toBeNull();
    expect(parseDiscountPercent("%150 indirim")).toBeNull();
  });
});

describe("buildDiscountCode", () => {
  it("uses the rate when there is one", () => {
    expect(buildDiscountCode("Test Kafe", "%10 indirim")).toBe("EYB10");
    expect(buildDiscountCode("Test Kitabevi", "%20 indirim")).toBe("EYB20");
  });

  it("falls back to the brand name, folded to ASCII", () => {
    expect(buildDiscountCode("Şişli Çiçek", "1 alana 1 bedava")).toBe("EYBSISL");
    expect(buildDiscountCode("Ünlü Güneş", null)).toBe("EYBUNLU");
  });

  it("falls back to randomness when the name has no usable letters", () => {
    expect(buildDiscountCode("!!!", null)).toMatch(/^EYB[A-Z0-9]{4}$/);
  });
});

describe("makeUniqueDiscountCode", () => {
  it("returns the plain code when it is free", () => {
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", ["EYB20"])).toBe("EYB10");
  });

  it("appends brand initials on a collision", () => {
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", ["EYB10"])).toBe("EYB10TK");
  });

  it("compares case-insensitively", () => {
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", ["eyb10"])).toBe("EYB10TK");
  });

  it("falls back to a numeric suffix when the initials are taken too", () => {
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", ["EYB10", "EYB10TK"])).toBe("EYB10-2");
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", ["EYB10", "EYB10TK", "EYB10-2"])).toBe("EYB10-3");
  });

  it("ignores empty entries in the taken list", () => {
    expect(makeUniqueDiscountCode("Test Kafe", "%10 indirim", [null, undefined, ""])).toBe("EYB10");
  });
});

describe("normalizeDiscountCode", () => {
  it("upper-cases and strips anything unusable", () => {
    expect(normalizeDiscountCode(" eyb 10 ")).toBe("EYB10");
    expect(normalizeDiscountCode("eyb-10")).toBe("EYB-10");
    expect(normalizeDiscountCode("indirim%kodu")).toBe("INDIRIMKODU");
  });

  it("folds Turkish letters", () => {
    expect(normalizeDiscountCode("şişli")).toBe("SISLI");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeDiscountCode(null)).toBe("");
  });
});

describe("buildMemberCode", () => {
  it("derives a per-member code from the campaign code", () => {
    expect(buildMemberCode("EYB10")).toMatch(/^EYB10-[A-Z0-9]{6}$/);
  });

  it("avoids characters that are easy to misread", () => {
    for (let i = 0; i < 50; i++) {
      expect(buildMemberCode("EYB10").split("-")[1]).not.toMatch(/[IO01]/);
    }
  });

  it("does not repeat itself", () => {
    const codes = new Set(Array.from({ length: 50 }, () => buildMemberCode("EYB10")));
    expect(codes.size).toBe(50);
  });
});

describe("isCodeUsable", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("accepts a code with no window", () => {
    expect(isCodeUsable({}, now)).toBe(true);
  });

  it("rejects an inactive code", () => {
    expect(isCodeUsable({ is_active: false }, now)).toBe(false);
  });

  it("respects both ends of the window", () => {
    expect(isCodeUsable({ valid_from: "2026-10-01T00:00:00Z" }, now)).toBe(false);
    expect(isCodeUsable({ valid_until: "2026-09-01T00:00:00Z" }, now)).toBe(false);
    expect(isCodeUsable({ valid_from: "2026-09-01T00:00:00Z", valid_until: "2026-12-31T00:00:00Z" }, now)).toBe(true);
  });

  it("ignores unparseable dates instead of hiding the code", () => {
    expect(isCodeUsable({ valid_until: "bozuk-tarih" }, now)).toBe(true);
  });
});

describe("describeCodeWindow", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("describes an end date", () => {
    expect(describeCodeWindow({ valid_until: "2026-12-31T00:00:00Z" }, now)).toBe(
      "31 Aralık 2026 tarihine kadar geçerli",
    );
  });

  it("describes a future start", () => {
    expect(describeCodeWindow({ valid_from: "2026-10-01T00:00:00Z" }, now)).toBe(
      "1 Ekim 2026 tarihinden itibaren geçerli",
    );
    expect(describeCodeWindow({ valid_from: "2026-10-01T00:00:00Z", valid_until: "2026-10-31T00:00:00Z" }, now)).toBe(
      "1 Ekim 2026 - 31 Ekim 2026 arasında geçerli",
    );
  });

  it("says when a code has expired", () => {
    expect(describeCodeWindow({ valid_until: "2026-09-01T00:00:00Z" }, now)).toBe("1 Eylül 2026 tarihinde süresi doldu");
  });

  it("returns an empty string when there are no dates", () => {
    expect(describeCodeWindow({}, now)).toBe("");
  });
});

describe("computeMemberCodeExpiry", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("defaults to 30 days out", () => {
    expect(computeMemberCodeExpiry(null, now).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });

  it("never outlives the campaign", () => {
    expect(computeMemberCodeExpiry("2026-09-20T00:00:00Z", now).toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });

  it("keeps the 30-day cap when the campaign ends later", () => {
    expect(computeMemberCodeExpiry("2027-01-01T00:00:00Z", now).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });
});

describe("isDuplicateRedemption", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  it("treats a first use as not a duplicate", () => {
    expect(isDuplicateRedemption(null, now)).toBe(false);
    expect(isDuplicateRedemption(undefined, now)).toBe(false);
  });

  it("refuses a second entry seconds after the first", () => {
    expect(isDuplicateRedemption("2026-09-08T11:59:50Z", now)).toBe(true);
  });

  it("allows a genuine repeat visit later on", () => {
    expect(isDuplicateRedemption("2026-09-08T11:50:00Z", now)).toBe(false);
    expect(isDuplicateRedemption("2026-09-07T12:00:00Z", now)).toBe(false);
  });

  it("uses a two-minute window by default", () => {
    expect(DUPLICATE_REDEMPTION_WINDOW_MS).toBe(120000);
    const justInside = new Date(now.getTime() - DUPLICATE_REDEMPTION_WINDOW_MS + 1000).toISOString();
    const justOutside = new Date(now.getTime() - DUPLICATE_REDEMPTION_WINDOW_MS).toISOString();
    expect(isDuplicateRedemption(justInside, now)).toBe(true);
    expect(isDuplicateRedemption(justOutside, now)).toBe(false);
  });

  it("ignores an unparseable timestamp instead of blocking the sale", () => {
    expect(isDuplicateRedemption("bozuk-tarih", now)).toBe(false);
  });
});

describe("foldTurkish", () => {
  it("maps Turkish letters to ASCII", () => {
    expect(foldTurkish("Şişli Çiçek Ğüzel İstanbul")).toBe("Sisli Cicek Guzel Istanbul");
  });
});
