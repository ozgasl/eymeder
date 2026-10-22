import { supabaseAdmin } from "@/integrations/supabase/admin";
import { fetchAllFonzipUsers, warmFonzipToken } from "@/lib/fonzipClient";
import { readFieldValue } from "@/lib/fonzipProbe";
import {
  planLocationSync,
  withKeptValues,
  type FonzipSyncRow,
  type ProfileChange,
  type SyncPlan,
  type SyncProfile,
} from "@/lib/fonzipLocationPlan";

// Server-only: reads every Fonzip user and our profiles, plans the sync (see
// fonzipLocationPlan.ts for the rules) and, only when asked, writes it.

const UNIVERSITY_KEY = "user_defined_values__mezun-oldugu-universite";
const DEPARTMENT_KEY = "user_defined_values__mezun-oldugu-universite-bolumu";
const YEAR_KEY = "user_defined_values__mezun-oldugu-yil";
const WRITE_BATCH = 10;
const PROFILE_PAGE = 1000;

export class LocationSyncError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function loadFonzipRows(): Promise<FonzipSyncRow[]> {
  await warmFonzipToken();
  const paged = await fetchAllFonzipUsers([
    "id",
    "membership_no",
    "email",
    "city_text",
    "district_text",
    "country_text",
    UNIVERSITY_KEY,
    DEPARTMENT_KEY,
    YEAR_KEY,
  ]);
  if (paged.status !== 200) {
    throw new LocationSyncError(`Fonzip kullanıcı listesi alınamadı (Fonzip ${paged.status || "yanıt vermedi"}).`, 502);
  }
  // A partial list would quietly mark real members "not in Fonzip".
  if (paged.truncated) {
    throw new LocationSyncError("Fonzip kullanıcı listesi eksik geldi (sayfalama yarıda kesildi), tekrar deneyin.", 502);
  }
  return paged.rows.map((r) => ({
    membership_no: r.membership_no,
    email: r.email,
    city_text: r.city_text,
    district_text: r.district_text,
    country_text: r.country_text,
    university: readFieldValue(r, UNIVERSITY_KEY),
    department: readFieldValue(r, DEPARTMENT_KEY),
    graduation_year: readFieldValue(r, YEAR_KEY),
  }));
}

interface LoadedProfiles {
  profiles: SyncProfile[];
  // Highest sort_order per profile, so an added university goes last.
  maxSortOrder: Map<string, number>;
}

async function loadProfiles(): Promise<LoadedProfiles> {
  const rows: any[] = [];
  for (let from = 0; ; from += PROFILE_PAGE) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, graduation_year, school_number, email, city, country")
      .order("id")
      .range(from, from + PROFILE_PAGE - 1);
    if (error) throw new LocationSyncError(`Profiller okunamadı: ${error.message}`, 500);
    rows.push(...(data ?? []));
    if (!data || data.length < PROFILE_PAGE) break;
  }

  const universities: any[] = [];
  for (let from = 0; ; from += PROFILE_PAGE) {
    const { data, error } = await supabaseAdmin
      .from("profile_universities")
      .select("profile_id, university, department, sort_order")
      .order("id")
      .range(from, from + PROFILE_PAGE - 1);
    if (error) throw new LocationSyncError(`Üniversiteler okunamadı: ${error.message}`, 500);
    universities.push(...(data ?? []));
    if (!data || data.length < PROFILE_PAGE) break;
  }

  const byProfile = new Map<string, SyncProfile["universities"]>();
  const maxSortOrder = new Map<string, number>();
  for (const u of universities) {
    const list = byProfile.get(u.profile_id) ?? [];
    list.push({ university: u.university, department: u.department });
    byProfile.set(u.profile_id, list);
    maxSortOrder.set(u.profile_id, Math.max(maxSortOrder.get(u.profile_id) ?? 0, u.sort_order ?? 0));
  }

  return {
    profiles: rows.map((p) => ({ ...p, universities: byProfile.get(p.id) ?? [] })),
    maxSortOrder,
  };
}

export type PlanSummary = Omit<SyncPlan, "changes"> & { changeCount: number };

export interface AppliedSummary {
  updatedProfiles: Array<{ id: string; before: { city: string | null; country: string | null } }>;
  insertedUniversities: Array<{ profileId: string; university: string }>;
  failures: string[];
}

export interface LocationSyncResult {
  mode: "dry-run" | "apply";
  plan: PlanSummary;
  applied?: AppliedSummary;
}

async function applyChanges(
  changes: ProfileChange[],
  profiles: SyncProfile[],
  maxSortOrder: Map<string, number>
): Promise<AppliedSummary> {
  const before = new Map(profiles.map((p) => [p.id, { city: p.city, country: p.country }]));
  const applied: AppliedSummary = { updatedProfiles: [], insertedUniversities: [], failures: [] };

  for (let i = 0; i < changes.length; i += WRITE_BATCH) {
    await Promise.all(
      changes.slice(i, i + WRITE_BATCH).map(async (change) => {
        const patch: { city?: string; country?: string } = {};
        if (change.city) patch.city = change.city;
        if (change.country) patch.country = change.country;

        if (Object.keys(patch).length > 0) {
          const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", change.profileId);
          if (error) applied.failures.push(`profil ${change.profileId}: ${error.message}`);
          else applied.updatedProfiles.push({ id: change.profileId, before: before.get(change.profileId)! });
        }

        if (change.addUniversity) {
          const { error } = await supabaseAdmin.from("profile_universities").insert({
            profile_id: change.profileId,
            university: change.addUniversity.university,
            department: change.addUniversity.department,
            // The Fonzip field gives no graduation year.
            status: change.addUniversity.status,
            sort_order: (maxSortOrder.get(change.profileId) ?? -1) + 1,
          });
          if (error) applied.failures.push(`üniversite ${change.profileId}: ${error.message}`);
          else applied.insertedUniversities.push({ profileId: change.profileId, university: change.addUniversity.university });
        }
      })
    );
  }
  return applied;
}

// `expectedChanges` is the profile count from the dry run the staff member
// reviewed: if Fonzip or the profiles moved since, the apply refuses rather
// than write something nobody looked at. `keepOurs` lists profiles whose
// existing city/country the reviewer chose to keep over Fonzip's.
export async function runLocationSync(options: {
  apply: boolean;
  expectedChanges?: number;
  keepOurs?: string[];
}): Promise<LocationSyncResult> {
  const [rows, { profiles, maxSortOrder }] = await Promise.all([loadFonzipRows(), loadProfiles()]);
  const plan = planLocationSync(rows, profiles);
  const { changes, ...rest } = plan;
  const summary: PlanSummary = { ...rest, changeCount: changes.length };

  if (!options.apply) return { mode: "dry-run", plan: summary };

  if (options.expectedChanges !== changes.length) {
    throw new LocationSyncError(
      `Önizlemedeki değişiklik sayısı (${options.expectedChanges ?? "belirtilmedi"}) ile şimdiki plan (${changes.length}) farklı. Önizlemeyi yenileyip tekrar inceleyin.`,
      409
    );
  }
  const effective = withKeptValues(changes, profiles, options.keepOurs ?? []);
  return { mode: "apply", plan: summary, applied: await applyChanges(effective, profiles, maxSortOrder) };
}
