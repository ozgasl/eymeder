import { flattenValue } from "@/lib/fonzipValues";
import { indexFonzipRows, matchProfileToFonzip } from "@/lib/fonzipProfileMatch";
import { mapFonzipPlace } from "@/lib/fonzipPlaces";
import { mapFonzipUniversity } from "@/lib/fonzipUniversities";
import { normalizePlace } from "@/lib/placeNormalize";

// Pure planning for the Fonzip → profile location/university sync: given the
// Fonzip rows and our profiles, work out exactly which profile gets which
// write, and what couldn't be placed. Nothing here touches the network or the
// database, so a dry run and the real run share one code path.
//
// Policy (decided with the association, 2026-10-22): Fonzip is more accurate
// than what members typed, so a value Fonzip gives OVERWRITES ours, but only
// when it maps onto our canonical lists; anything unrecognised is reported,
// never written. Universities are only ever ADDED, never replaced or removed.

export interface FonzipSyncRow {
  membership_no?: number | string | null;
  email?: string | null;
  city_text?: unknown;
  district_text?: unknown;
  country_text?: unknown;
  // "Mezun Olduğum Üniversite Lisans/Ön Lisans", its department, and "Mezun Olduğum Yıl".
  university?: unknown;
  department?: unknown;
  graduation_year?: unknown;
}

export interface SyncProfile {
  id: string;
  full_name: string | null;
  graduation_year: number | null;
  school_number: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  universities: Array<{ university: string; department: string | null }>;
}

export interface ProfileChange {
  profileId: string;
  // Present only when the value would change.
  city?: string;
  country?: string;
  addUniversity?: { university: string; department: string | null };
}

export interface CountedValue {
  value: string;
  count: number;
}

export interface SyncPlan {
  stats: {
    fonzipUsers: number;
    profiles: number;
    matched: number;
    unmatched: number;
    cityFilled: number;
    cityOverwritten: number;
    countryFilled: number;
    countryOverwritten: number;
    universitiesToAdd: number;
    universitiesAlreadyThere: number;
    junkUniversities: number;
  };
  changes: ProfileChange[];
  // Fonzip place text we couldn't map (most common first).
  unresolvedPlaces: CountedValue[];
  // Fonzip university text we couldn't map and nobody has classed as junk.
  unmatchedUniversities: CountedValue[];
  // A value of ours that a Fonzip value would replace with a different one.
  overwrites: Array<{ name: string | null; field: "city" | "country"; from: string; to: string }>;
  // Graduation year disagrees: reported, never written.
  graduationYearDiffers: Array<{ name: string | null; ours: number; fonzip: number }>;
}

const text = (v: unknown): string => flattenValue(v);

function tally(values: string[]): CountedValue[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .map(([value, count]) => ({ value, count }));
}

export function planLocationSync(rows: FonzipSyncRow[], profiles: SyncProfile[]): SyncPlan {
  const index = indexFonzipRows(rows);
  const stats: SyncPlan["stats"] = {
    fonzipUsers: rows.length,
    profiles: profiles.length,
    matched: 0,
    unmatched: 0,
    cityFilled: 0,
    cityOverwritten: 0,
    countryFilled: 0,
    countryOverwritten: 0,
    universitiesToAdd: 0,
    universitiesAlreadyThere: 0,
    junkUniversities: 0,
  };
  const changes: ProfileChange[] = [];
  const unresolvedPlaces: string[] = [];
  const unmatchedUniversities: string[] = [];
  const overwrites: SyncPlan["overwrites"] = [];
  const graduationYearDiffers: SyncPlan["graduationYearDiffers"] = [];

  for (const profile of profiles) {
    const found = matchProfileToFonzip(profile, index);
    if (!found) {
      stats.unmatched += 1;
      continue;
    }
    stats.matched += 1;
    const row = found.row;
    const change: ProfileChange = { profileId: profile.id };

    const place = mapFonzipPlace(text(row.city_text), text(row.district_text), text(row.country_text));
    if (place.ok) {
      for (const field of ["city", "country"] as const) {
        const next = place[field];
        const current = (profile[field] ?? "").trim();
        if (current === next) continue;
        change[field] = next;
        if (!current) {
          if (field === "city") stats.cityFilled += 1;
          else stats.countryFilled += 1;
        } else {
          if (field === "city") stats.cityOverwritten += 1;
          else stats.countryOverwritten += 1;
          // A different spelling of the same place isn't a conflict worth listing.
          if (normalizePlace(current) !== normalizePlace(next)) {
            overwrites.push({ name: profile.full_name, field, from: current, to: next });
          }
        }
      }
    } else if ("value" in place && place.value) {
      unresolvedPlaces.push(place.value);
    }

    const rawUniversity = text(row.university);
    if (rawUniversity) {
      const mapping = mapFonzipUniversity(rawUniversity);
      if (mapping.kind === "junk") {
        stats.junkUniversities += 1;
      } else if (mapping.kind === "unmatched") {
        unmatchedUniversities.push(rawUniversity);
      } else {
        const key = normalizePlace(mapping.value.university);
        if (profile.universities.some((u) => normalizePlace(u.university) === key)) {
          stats.universitiesAlreadyThere += 1;
        } else {
          stats.universitiesToAdd += 1;
          change.addUniversity = {
            university: mapping.value.university,
            department: mapping.value.department ?? (text(row.department) || null),
          };
        }
      }
    }

    const fonzipYear = Number(text(row.graduation_year));
    if (profile.graduation_year != null && Number.isFinite(fonzipYear) && fonzipYear > 0 && fonzipYear !== profile.graduation_year) {
      graduationYearDiffers.push({ name: profile.full_name, ours: profile.graduation_year, fonzip: fonzipYear });
    }

    if (change.city || change.country || change.addUniversity) changes.push(change);
  }

  return {
    stats,
    changes,
    unresolvedPlaces: tally(unresolvedPlaces),
    unmatchedUniversities: tally(unmatchedUniversities),
    overwrites,
    graduationYearDiffers,
  };
}
