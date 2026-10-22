import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  fetchAllFonzipUsers,
  fetchFonzipUserDefinedValues,
  fonzipExtractList,
  warmFonzipToken,
} from "@/lib/fonzipClient";
import { flattenValue } from "@/lib/fonzipValues";
import { indexFonzipRows, matchProfileToFonzip } from "@/lib/fonzipProfileMatch";
import { normalizePlace } from "@/lib/placeNormalize";

// Read-only discovery of which location/university fields Fonzip will actually
// hand back, and how well its members line up with our profiles. Returns
// aggregates only (counts and the most common values), never a row per person.

const TOP_VALUES = 30;
const RELEVANT_UDV_NAME = /üniversite|universite|university|okul|mezun|ülke|ulke|şehir|sehir|yaşa/i;
// key_type 9 is a file upload (e.g. the graduation certificate), never text.
const FILE_UDV_TYPE = 9;
const LOCATION_FIELDS = ["country_text", "city_text", "district_text"] as const;

export interface ValueSummary {
  users: number;
  filled: number;
  distinct: number;
  top: Array<{ value: string; count: number }>;
}

export { flattenValue };

export function summarizeValues(values: unknown[], topN = TOP_VALUES): ValueSummary {
  const counts = new Map<string, number>();
  let filled = 0;
  for (const raw of values) {
    const value = flattenValue(raw);
    if (!value) continue;
    filled += 1;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .slice(0, topN)
    .map(([value, count]) => ({ value, count }));
  return { users: values.length, filled, distinct: counts.size, top };
}

export const extractList = fonzipExtractList;

export interface UserDefinedValueDef {
  udv_id?: number;
  name?: string;
  value?: string;
  key_type?: number;
}

export function findRelevantUdvs(defs: UserDefinedValueDef[]): UserDefinedValueDef[] {
  return defs.filter(
    (d) => typeof d.name === "string" && RELEVANT_UDV_NAME.test(d.name) && d.value && d.key_type !== FILE_UDV_TYPE
  );
}

// A UDV can come back flat (`row[user_defined_values__KEY]`) or nested under
// `user_defined_values`; accept both since the spec shows neither for POST /users.
export function readFieldValue(row: any, field: string): unknown {
  if (row == null) return undefined;
  if (field in row) return row[field];
  const prefix = "user_defined_values__";
  if (field.startsWith(prefix)) return row.user_defined_values?.[field.slice(prefix.length)];
  return undefined;
}

export interface FonzipLocationRow {
  membership_no?: number | string | null;
  email?: string | null;
  city_text?: string | null;
  country_text?: string | null;
  // The "Mezun Olduğum Üniversite Lisans/Ön Lisans" and "Mezun Olduğum Yıl" UDVs.
  university?: string | null;
  graduation_year?: number | string | null;
}

export interface ProfileLocationRow {
  graduation_year: number | null;
  school_number: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  // Already has at least one profile_universities row.
  has_university?: boolean;
}

export interface OverlapSummary {
  fonzipUsers: number;
  profiles: number;
  matchedByMembershipNo: number;
  matchedByEmailOnly: number;
  profilesWithoutFonzipMatch: number;
  // Matched profile has no value, Fonzip does: what a sync would fill.
  wouldFillCity: number;
  wouldFillCountry: number;
  // Both sides have a value and they differ (compared via normalizePlace).
  conflictCity: number;
  conflictCountry: number;
  // Matched profile has no university rows, Fonzip has a (raw) one.
  wouldFillUniversity: number;
  // Fonzip "Mezun Olduğum Yıl" vs our graduation_year, both present.
  graduationYearAgrees: number;
  graduationYearDiffers: number;
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function estimateOverlap(fonzip: FonzipLocationRow[], profiles: ProfileLocationRow[]): OverlapSummary {
  const index = indexFonzipRows(fonzip);

  const out: OverlapSummary = {
    fonzipUsers: fonzip.length,
    profiles: profiles.length,
    matchedByMembershipNo: 0,
    matchedByEmailOnly: 0,
    profilesWithoutFonzipMatch: 0,
    wouldFillCity: 0,
    wouldFillCountry: 0,
    conflictCity: 0,
    conflictCountry: 0,
    wouldFillUniversity: 0,
    graduationYearAgrees: 0,
    graduationYearDiffers: 0,
  };

  for (const p of profiles) {
    const found = matchProfileToFonzip(p, index);
    if (!found) {
      out.profilesWithoutFonzipMatch += 1;
      continue;
    }
    const match = found.row;
    if (found.via === "membership_no") out.matchedByMembershipNo += 1;
    else out.matchedByEmailOnly += 1;

    for (const [ours, theirs, fill, conflict] of [
      [p.city, match.city_text, "wouldFillCity", "conflictCity"],
      [p.country, match.country_text, "wouldFillCountry", "conflictCountry"],
    ] as const) {
      const a = clean(ours);
      const b = clean(theirs);
      if (!b) continue;
      if (!a) out[fill] += 1;
      else if (normalizePlace(a) !== normalizePlace(b)) out[conflict] += 1;
    }

    if (clean(match.university) && !p.has_university) out.wouldFillUniversity += 1;

    const theirYear = Number(match.graduation_year);
    if (p.graduation_year != null && Number.isFinite(theirYear) && theirYear > 0) {
      if (theirYear === p.graduation_year) out.graduationYearAgrees += 1;
      else out.graduationYearDiffers += 1;
    }
  }

  return out;
}

export interface FieldProbeResult {
  field: string;
  // HTTP status of the first page, 0 = no answer. 403 means Fonzip refuses the field.
  status: number;
  users: number;
  summary: ValueSummary | null;
  // What the raw (non-string) values look like, for select-type UDVs.
  shapeSample?: string[];
  error?: string;
}

function summarizeField(field: string, rows: any[]): FieldProbeResult {
  const raw = rows.map((r) => readFieldValue(r, field));
  const shapeSample = [
    ...new Set(raw.filter((v) => v != null && typeof v === "object").map((v) => JSON.stringify(v).slice(0, 200))),
  ].slice(0, 3);
  return {
    field,
    status: 200,
    users: rows.length,
    summary: summarizeValues(raw),
    shapeSample: shapeSample.length ? shapeSample : undefined,
  };
}

export interface FonzipProbeReport {
  userDefinedValues: {
    status: number;
    count: number;
    // Definitions are field names, not member data.
    definitions: Array<{ udv_id?: number; name?: string; value?: string; key_type?: number }>;
    probed: Array<{ name?: string; value?: string; key_type?: number }>;
  };
  // "combined" = one paged pass with every field at once (the normal case);
  // "per-field" = Fonzip refused the combined request, so each field was asked alone.
  mode: "combined" | "per-field";
  pagesRead: number;
  truncated: boolean;
  fields: FieldProbeResult[];
  overlap: OverlapSummary | { skipped: string };
}

const UNIVERSITY_KEY = "user_defined_values__mezun-oldugu-universite";
const YEAR_KEY = "user_defined_values__mezun-oldugu-yil";

async function loadProfiles(): Promise<{ profiles: ProfileLocationRow[]; error?: string }> {
  const [profilesRes, universitiesRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, graduation_year, school_number, email, city, country"),
    supabaseAdmin.from("profile_universities").select("profile_id"),
  ]);
  if (profilesRes.error) return { profiles: [], error: `profiller okunamadı: ${profilesRes.error.message}` };
  const withUniversity = new Set((universitiesRes.data ?? []).map((u) => u.profile_id));
  return {
    profiles: (profilesRes.data ?? []).map((p) => ({ ...p, has_university: withUniversity.has(p.id) })),
  };
}

export async function runFonzipProbe(): Promise<FonzipProbeReport> {
  // One token for every request below (see warmFonzipToken).
  await warmFonzipToken();

  const udvResponse = await fetchFonzipUserDefinedValues();
  const defs = (udvResponse.status === 200 ? extractList(udvResponse.body) : []) as UserDefinedValueDef[];
  const relevant = findRelevantUdvs(defs);
  const udvKeys = relevant.map((d) => `user_defined_values__${d.value}`);
  const probedFields = [...LOCATION_FIELDS, ...udvKeys];

  // Everything in one paged pass: a pass per field (the first version) tripped
  // Fonzip's rate limit (429) and truncated most fields at 400-500 users.
  let paged = await fetchAllFonzipUsers(["id", "membership_no", "email", ...probedFields]);
  let mode: FonzipProbeReport["mode"] = "combined";
  let fields: FieldProbeResult[];
  let fonzipRows: FonzipLocationRow[] = [];

  if (paged.status === 200) {
    fields = probedFields.map((f) => summarizeField(f, paged.rows));
    fonzipRows = paged.rows.map((r) => ({
      membership_no: r.membership_no,
      email: r.email,
      city_text: flattenValue(r.city_text),
      country_text: flattenValue(r.country_text),
      university: flattenValue(readFieldValue(r, UNIVERSITY_KEY)),
      graduation_year: flattenValue(readFieldValue(r, YEAR_KEY)),
    }));
  } else {
    // Combined request refused: ask field by field, one after another.
    mode = "per-field";
    fields = [];
    for (const f of probedFields) {
      const one = await fetchAllFonzipUsers(["id", f]);
      fields.push(
        one.status === 200
          ? summarizeField(f, one.rows)
          : { field: f, status: one.status, users: 0, summary: null, error: `Fonzip ${one.status || "yanıt vermedi"}` }
      );
    }
    paged = { ...paged, pagesRead: 0, truncated: false };
  }

  let overlap: FonzipProbeReport["overlap"] = {
    skipped: `membership_no/email alanları alınamadı (Fonzip ${paged.status || "yanıt vermedi"})`,
  };
  if (mode === "combined") {
    const { profiles, error } = await loadProfiles();
    overlap = error ? { skipped: error } : estimateOverlap(fonzipRows, profiles);
  }

  return {
    userDefinedValues: {
      status: udvResponse.status,
      count: defs.length,
      definitions: defs.map(({ udv_id, name, value, key_type }) => ({ udv_id, name, value, key_type })),
      probed: relevant.map(({ name, value, key_type }) => ({ name, value, key_type })),
    },
    mode,
    pagesRead: paged.pagesRead,
    truncated: paged.truncated,
    fields,
    overlap,
  };
}
