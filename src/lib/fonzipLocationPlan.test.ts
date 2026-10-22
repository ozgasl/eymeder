import { describe, it, expect } from "vitest";
import { planLocationSync, withKeptValues, type FonzipSyncRow, type SyncProfile } from "./fonzipLocationPlan";

const profile = (over: Partial<SyncProfile> = {}): SyncProfile => ({
  id: "p1",
  full_name: "Ayşe Örnek",
  graduation_year: 1996,
  school_number: "758",
  email: "ayse@example.com",
  city: null,
  country: null,
  universities: [],
  ...over,
});

const row = (over: Partial<FonzipSyncRow> = {}): FonzipSyncRow => ({
  membership_no: 19960758,
  email: "ayse@example.com",
  city_text: "Istanbul",
  district_text: "Kadıköy",
  country_text: "",
  university: "İTÜ",
  department: null,
  graduation_year: 1996,
  ...over,
});

describe("planLocationSync", () => {
  it("fills an empty profile from Fonzip", () => {
    const plan = planLocationSync([row()], [profile()]);
    expect(plan.changes).toEqual([
      {
        profileId: "p1",
        city: "İstanbul",
        country: "Türkiye",
        addUniversity: { university: "İstanbul Teknik Üniversitesi", department: null },
      },
    ]);
    expect(plan.stats).toMatchObject({ matched: 1, cityFilled: 1, countryFilled: 1, universitiesToAdd: 1 });
  });

  it("lets Fonzip overwrite a different value and lists it", () => {
    const plan = planLocationSync([row()], [profile({ city: "İzmir", country: "Türkiye" })]);
    expect(plan.changes[0]).toMatchObject({ city: "İstanbul" });
    expect(plan.changes[0].country).toBeUndefined();
    expect(plan.stats.cityOverwritten).toBe(1);
    expect(plan.overwrites).toEqual([
      { profileId: "p1", name: "Ayşe Örnek", field: "city", from: "İzmir", to: "İstanbul" },
    ]);
  });

  it("does not list a respelling as a conflict, and writes nothing when already equal", () => {
    const respelled = planLocationSync([row()], [profile({ city: "istanbul", country: "Türkiye" })]);
    expect(respelled.overwrites).toEqual([]);
    expect(respelled.changes[0].city).toBe("İstanbul");

    const same = planLocationSync([row({ university: "" })], [profile({ city: "İstanbul", country: "Türkiye" })]);
    expect(same.changes).toEqual([]);
  });

  it("never writes an unrecognised place or university; reports them with counts", () => {
    const rows = [
      row({ membership_no: 1, email: "a@x.com", city_text: "NJ 07310, USA", district_text: "", university: "Amsterdam Üniversitesi" }),
      row({ membership_no: 2, email: "b@x.com", city_text: "NJ 07310, USA", district_text: "", university: "Amsterdam Üniversitesi" }),
    ];
    const profiles = [
      profile({ id: "a", graduation_year: null, school_number: null, email: "a@x.com" }),
      profile({ id: "b", graduation_year: null, school_number: null, email: "b@x.com" }),
    ];
    const plan = planLocationSync(rows, profiles);
    expect(plan.changes).toEqual([]);
    expect(plan.unresolvedPlaces).toEqual([{ value: "NJ 07310, USA", count: 2 }]);
    expect(plan.unmatchedUniversities).toEqual([{ value: "Amsterdam Üniversitesi", count: 2 }]);
  });

  it("only adds a university, and skips one the member already has", () => {
    const has = planLocationSync(
      [row({ city_text: "", district_text: "" })],
      [profile({ universities: [{ university: "İSTANBUL TEKNİK ÜNİVERSİTESİ", department: null }] })]
    );
    expect(has.changes).toEqual([]);
    expect(has.stats.universitiesAlreadyThere).toBe(1);

    const other = planLocationSync(
      [row({ city_text: "", district_text: "" })],
      [profile({ universities: [{ university: "Marmara Üniversitesi", department: null }] })]
    );
    expect(other.changes[0].addUniversity?.university).toBe("İstanbul Teknik Üniversitesi");
  });

  it("uses the department column when the university text carried none", () => {
    const plan = planLocationSync([row({ department: "Makine Mühendisliği" })], [profile()]);
    expect(plan.changes[0].addUniversity).toEqual({
      university: "İstanbul Teknik Üniversitesi",
      department: "Makine Mühendisliği",
    });
  });

  it("counts junk university text separately", () => {
    const plan = planLocationSync([row({ university: "-" })], [profile()]);
    expect(plan.stats.junkUniversities).toBe(1);
    expect(plan.unmatchedUniversities).toEqual([]);
  });

  it("skips profiles whose Fonzip match is ambiguous", () => {
    const rows = [row(), row({ membership_no: 19960758, email: "other@x.com" })];
    const plan = planLocationSync(rows, [profile()]);
    expect(plan.stats.matched).toBe(0);
    expect(plan.stats.unmatched).toBe(1);
    expect(plan.changes).toEqual([]);
  });

  it("reports a graduation year that disagrees without writing it", () => {
    const plan = planLocationSync([row({ graduation_year: 1999 })], [profile()]);
    expect(plan.graduationYearDiffers).toEqual([{ name: "Ayşe Örnek", ours: 1996, fonzip: 1999 }]);
    expect(Object.keys(plan.changes[0])).not.toContain("graduation_year");
  });

  it("is idempotent: applying the plan's values yields no further changes", () => {
    const first = planLocationSync([row()], [profile()]);
    const c = first.changes[0];
    const applied = profile({
      city: c.city,
      country: c.country,
      universities: [{ university: c.addUniversity!.university, department: c.addUniversity!.department }],
    });
    expect(planLocationSync([row()], [applied]).changes).toEqual([]);
  });
});

describe("universityMappings", () => {
  it("lists what each Fonzip text becomes, with counts", () => {
    const rows = [
      row({ membership_no: 1, email: "a@x.com", university: "İTÜ" }),
      row({ membership_no: 2, email: "b@x.com", university: "İTÜ" }),
      row({ membership_no: 3, email: "c@x.com", university: "Ankara üniversitesi diş hekimliği fakültesi" }),
    ];
    const profiles = ["a", "b", "c"].map((id) =>
      profile({ id, graduation_year: null, school_number: null, email: `${id}@x.com` })
    );
    expect(planLocationSync(rows, profiles).universityMappings).toEqual([
      { from: "İTÜ", university: "İstanbul Teknik Üniversitesi", department: null, count: 2 },
      {
        from: "Ankara üniversitesi diş hekimliği fakültesi",
        university: "Ankara Üniversitesi",
        department: "diş hekimliği fakültesi",
        count: 1,
      },
    ]);
  });
});

describe("withKeptValues", () => {
  const changes = [
    { profileId: "keep", city: "İstanbul", country: "Türkiye", addUniversity: { university: "X", department: null } },
    { profileId: "only-place", city: "Ankara" },
    { profileId: "other", city: "Bolu" },
  ];
  const profiles = [
    profile({ id: "keep", city: "Cape Town", country: "Güney Afrika" }),
    profile({ id: "only-place", city: "İzmir" }),
    profile({ id: "other", city: "Kars" }),
  ];

  it("keeps existing values but still writes the rest for that person", () => {
    const result = withKeptValues(changes, profiles, ["keep"]);
    expect(result.find((c) => c.profileId === "keep")).toEqual({
      profileId: "keep",
      addUniversity: { university: "X", department: null },
    });
    expect(result.find((c) => c.profileId === "other")).toEqual({ profileId: "other", city: "Bolu" });
  });

  it("drops a person who is left with nothing to write", () => {
    expect(withKeptValues(changes, profiles, ["only-place"]).map((c) => c.profileId)).toEqual(["keep", "other"]);
  });

  it("still fills an empty field for a kept person", () => {
    const result = withKeptValues(
      [{ profileId: "keep", city: "İstanbul", country: "Türkiye" }],
      [profile({ id: "keep", city: "Cape Town", country: null })],
      ["keep"]
    );
    expect(result).toEqual([{ profileId: "keep", country: "Türkiye" }]);
  });

  it("changes nothing when nobody is kept", () => {
    expect(withKeptValues(changes, profiles, [])).toBe(changes);
  });
});
