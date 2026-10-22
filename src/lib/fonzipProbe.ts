import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  fetchFonzipUserDefinedValues,
  fetchFonzipUsersPage,
  warmFonzipToken,
  type FonzipRawResponse,
} from "@/lib/fonzipClient";
import { buildFonzipMembershipNo } from "@/lib/fonzipMembershipNo";
import { normalizePlace } from "@/lib/placeNormalize";

// Read-only discovery of which location/university fields Fonzip will actually
// hand back, and how well its members line up with our profiles. Returns
// aggregates only (counts and the most common values), never a row per person.

const PAGE_SIZE = 100;
const MAX_PAGES = 30;
const TOP_VALUES = 30;
const UNIVERSITY_UDV_NAME = /üniversite|universite|university|okul|mezun/i;
const LOCATION_FIELDS = ["country_text", "city_text", "district_text"] as const;

// The spec marks `filter` required but not whether an empty attribute list is
// accepted; if it isn't, every user has a membership_no >= 1 anyway.
const FALLBACK_FILTER = [{ type: "default", parameter: "membership_no", condition: "gte", value: 1 }];

export interface ValueSummary {
  users: number;
  filled: number;
  distinct: number;
  top: Array<{ value: string; count: number }>;
}

export function summarizeValues(values: unknown[], topN = TOP_VALUES): ValueSummary {
  const counts = new Map<string, number>();
  let filled = 0;
  for (const raw of values) {
    const value = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();
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

// Fonzip's list endpoints wrap rows in a differently named key per resource
// (`user_list`, `event_list`...), and the spec doesn't name the one for
// user-defined values: take the first array in the body.
export function extractList(body: unknown): any[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    for (const v of Object.values(body as Record<string, unknown>)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export interface UserDefinedValueDef {
  udv_id?: number;
  name?: string;
  value?: string;
  key_type?: number;
}

export function findUniversityCandidates(defs: UserDefinedValueDef[]): UserDefinedValueDef[] {
  return defs.filter((d) => typeof d.name === "string" && UNIVERSITY_UDV_NAME.test(d.name) && d.value);
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
}

export interface ProfileLocationRow {
  graduation_year: number | null;
  school_number: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
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
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function estimateOverlap(fonzip: FonzipLocationRow[], profiles: ProfileLocationRow[]): OverlapSummary {
  const byNo = new Map<number, FonzipLocationRow>();
  const byEmail = new Map<string, FonzipLocationRow>();
  for (const f of fonzip) {
    const no = Number(f.membership_no);
    if (Number.isFinite(no) && no > 0) byNo.set(no, f);
    const email = clean(f.email).toLowerCase();
    if (email) byEmail.set(email, f);
  }

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
  };

  for (const p of profiles) {
    const no =
      p.graduation_year != null && p.school_number
        ? buildFonzipMembershipNo(p.graduation_year, p.school_number)
        : null;
    let match = no != null ? byNo.get(no) : undefined;
    if (match) {
      out.matchedByMembershipNo += 1;
    } else {
      match = byEmail.get(clean(p.email).toLowerCase());
      if (match) out.matchedByEmailOnly += 1;
    }
    if (!match) {
      out.profilesWithoutFonzipMatch += 1;
      continue;
    }

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
  }

  return out;
}

export interface FieldProbeResult {
  field: string;
  // HTTP status of the first page, 0 = no answer. 403 means Fonzip refuses the field.
  status: number;
  filterUsed: "empty" | "membership_no>=1" | null;
  pagesRead: number;
  truncated: boolean;
  summary: ValueSummary | null;
  error?: string;
}

interface PagedRows {
  status: number;
  filterUsed: FieldProbeResult["filterUsed"];
  pagesRead: number;
  truncated: boolean;
  rows: any[];
}

async function fetchAllUsers(valuesList: string[]): Promise<PagedRows> {
  let filter: unknown[] = [];
  let filterUsed: FieldProbeResult["filterUsed"] = "empty";
  let first: FonzipRawResponse = await fetchFonzipUsersPage(valuesList, 1, PAGE_SIZE, filter);
  if (first.status === 400) {
    filter = FALLBACK_FILTER;
    filterUsed = "membership_no>=1";
    first = await fetchFonzipUsersPage(valuesList, 1, PAGE_SIZE, filter);
  }
  if (first.status !== 200) {
    return { status: first.status, filterUsed: null, pagesRead: 0, truncated: false, rows: [] };
  }

  const rows: any[] = [...extractList(first.body?.user_list ?? first.body)];
  let pages = 1;
  let lastCount = rows.length;
  let truncated = false;
  while (lastCount >= PAGE_SIZE) {
    if (pages >= MAX_PAGES) {
      truncated = true;
      break;
    }
    const next = await fetchFonzipUsersPage(valuesList, pages + 1, PAGE_SIZE, filter);
    if (next.status !== 200) {
      truncated = true;
      break;
    }
    const list = extractList(next.body?.user_list ?? next.body);
    rows.push(...list);
    lastCount = list.length;
    pages += 1;
  }
  return { status: 200, filterUsed, pagesRead: pages, truncated, rows };
}

async function probeField(field: string): Promise<FieldProbeResult> {
  const paged = await fetchAllUsers(["id", field]);
  return {
    field,
    status: paged.status,
    filterUsed: paged.filterUsed,
    pagesRead: paged.pagesRead,
    truncated: paged.truncated,
    summary: paged.status === 200 ? summarizeValues(paged.rows.map((r) => readFieldValue(r, field))) : null,
    error: paged.status === 200 ? undefined : `Fonzip ${paged.status || "yanıt vermedi"}`,
  };
}

export interface FonzipProbeReport {
  userDefinedValues: {
    status: number;
    count: number;
    // Definitions are field names, not member data.
    definitions: Array<{ udv_id?: number; name?: string; value?: string; key_type?: number }>;
    universityCandidates: UserDefinedValueDef[];
  };
  fields: FieldProbeResult[];
  overlap: OverlapSummary | { skipped: string };
}

export async function runFonzipProbe(): Promise<FonzipProbeReport> {
  // One token for all the parallel requests below (see warmFonzipToken).
  await warmFonzipToken();

  const udvResponse = await fetchFonzipUserDefinedValues();
  const defs = (udvResponse.status === 200 ? extractList(udvResponse.body) : []) as UserDefinedValueDef[];
  const candidates = findUniversityCandidates(defs);

  const fieldNames = [
    ...LOCATION_FIELDS,
    ...candidates.map((d) => `user_defined_values__${d.value}`),
  ];
  const fields = await Promise.all(fieldNames.map(probeField));

  const cityOk = fields.find((f) => f.field === "city_text")?.status === 200;
  const countryOk = fields.find((f) => f.field === "country_text")?.status === 200;
  let overlap: FonzipProbeReport["overlap"] = { skipped: "city_text ve country_text alınamadı" };

  if (cityOk || countryOk) {
    const wanted = ["id", "membership_no", "email", ...(cityOk ? ["city_text"] : []), ...(countryOk ? ["country_text"] : [])];
    const paged = await fetchAllUsers(wanted);
    if (paged.status !== 200) {
      overlap = { skipped: `membership_no/email alanları alınamadı (Fonzip ${paged.status || "yanıt vermedi"})` };
    } else {
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("graduation_year, school_number, email, city, country");
      overlap = error
        ? { skipped: `profiller okunamadı: ${error.message}` }
        : estimateOverlap(paged.rows, (profiles ?? []) as ProfileLocationRow[]);
    }
  }

  return {
    userDefinedValues: {
      status: udvResponse.status,
      count: defs.length,
      definitions: defs.map(({ udv_id, name, value, key_type }) => ({ udv_id, name, value, key_type })),
      universityCandidates: candidates,
    },
    fields,
    overlap,
  };
}
