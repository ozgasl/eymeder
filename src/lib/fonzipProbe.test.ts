import { describe, it, expect, vi } from "vitest";

// fonzipProbe imports the service-role client and the Fonzip client, which
// need env vars at import time; the functions under test touch neither.
vi.mock("@/integrations/supabase/admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/fonzipClient", () => ({
  fetchAllFonzipUsers: vi.fn(),
  fetchFonzipUserDefinedValues: vi.fn(),
  fonzipExtractList: (body: unknown) => {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") {
      for (const v of Object.values(body as Record<string, unknown>)) if (Array.isArray(v)) return v;
    }
    return [];
  },
  warmFonzipToken: vi.fn(),
}));

import {
  estimateOverlap,
  extractList,
  findRelevantUdvs,
  flattenValue,
  readFieldValue,
  summarizeValues,
} from "./fonzipProbe";

describe("summarizeValues", () => {
  it("counts filled, distinct and ranks the most common first", () => {
    const s = summarizeValues(["İstanbul", "İstanbul", " Ankara ", "", null, undefined, "İzmir"]);
    expect(s.users).toBe(7);
    expect(s.filled).toBe(4);
    expect(s.distinct).toBe(3);
    expect(s.top[0]).toEqual({ value: "İstanbul", count: 2 });
  });

  it("limits the number of top values", () => {
    const values = Array.from({ length: 50 }, (_, i) => `Şehir ${i}`);
    expect(summarizeValues(values, 5).top).toHaveLength(5);
  });
});

describe("extractList", () => {
  it("takes the first array in an envelope, or the body itself", () => {
    expect(extractList({ result: "ok", udv_list: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(extractList([1, 2])).toEqual([1, 2]);
    expect(extractList(null)).toEqual([]);
  });
});

describe("findRelevantUdvs", () => {
  it("keeps university/country-like fields that have a key and drops file uploads", () => {
    const defs = [
      { name: "Üniversite", value: "value3" },
      { name: "Mezun olduğum okul", value: "value4" },
      { name: "Ülke", value: "ulke", key_type: 8 },
      { name: "Mezuniyet Belgesi Ekleme", value: "belge", key_type: 9 },
      { name: "Kan grubu", value: "value5" },
      { name: "University", value: undefined },
    ];
    expect(findRelevantUdvs(defs).map((d) => d.value)).toEqual(["value3", "value4", "ulke"]);
  });
});

describe("flattenValue", () => {
  it("reads select-type values instead of printing [object Object]", () => {
    expect(flattenValue({ id: 1, text: "Türkiye" })).toBe("Türkiye");
    expect(flattenValue([{ text: "A" }, { text: "B" }])).toBe("A, B");
    expect(flattenValue(1996)).toBe("1996");
    expect(flattenValue(null)).toBe("");
  });

  it("makes select values countable", () => {
    const s = summarizeValues([{ text: "Türkiye" }, { text: "Türkiye" }, null]);
    expect(s.top).toEqual([{ value: "Türkiye", count: 2 }]);
  });
});

describe("readFieldValue", () => {
  it("reads flat and nested user-defined values", () => {
    expect(readFieldValue({ city_text: "Bolu" }, "city_text")).toBe("Bolu");
    expect(readFieldValue({ user_defined_values: { value3: "ODTÜ" } }, "user_defined_values__value3")).toBe("ODTÜ");
    expect(readFieldValue({ "user_defined_values__value3": "ODTÜ" }, "user_defined_values__value3")).toBe("ODTÜ");
    expect(readFieldValue({}, "city_text")).toBeUndefined();
  });
});

describe("estimateOverlap", () => {
  const fonzip = [
    { membership_no: 19960758, email: "a@x.com", city_text: "İstanbul", country_text: "Türkiye", university: "İTÜ", graduation_year: "1996" },
    { membership_no: 20010001, email: "b@x.com", city_text: "ANKARA", country_text: "", graduation_year: "2002" },
    { membership_no: 5, email: "c@x.com", city_text: "Bolu", country_text: "Türkiye" },
  ];

  it("matches by membership_no first, then email, and counts fills and conflicts", () => {
    const profiles = [
      // matched by membership_no, both empty -> fills city + country
      { graduation_year: 1996, school_number: "758", email: "zzz@x.com", city: null, country: null, has_university: false },
      // matched by membership_no, same city spelled differently -> no conflict
      { graduation_year: 2001, school_number: "1", email: "b@x.com", city: "Ankara", country: "Türkiye" },
      // matched only by email, different city -> conflict
      { graduation_year: null, school_number: null, email: "C@x.com ", city: "İzmir", country: "Türkiye" },
      // no match
      { graduation_year: 1990, school_number: "9", email: "nobody@x.com", city: null, country: null },
    ];
    expect(estimateOverlap(fonzip, profiles)).toEqual({
      fonzipUsers: 3,
      profiles: 4,
      matchedByMembershipNo: 2,
      matchedByEmailOnly: 1,
      profilesWithoutFonzipMatch: 1,
      wouldFillCity: 1,
      wouldFillCountry: 1,
      conflictCity: 1,
      conflictCountry: 0,
      wouldFillUniversity: 1,
      graduationYearAgrees: 1,
      graduationYearDiffers: 1,
    });
  });
});
