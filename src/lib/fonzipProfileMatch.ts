import { buildFonzipMembershipNo } from "@/lib/fonzipMembershipNo";

// Pairs one of our profiles with its Fonzip user: by the computed membership_no
// first, then by e-mail. A profile is NEVER paired when the key it matched on
// belongs to more than one Fonzip user (a shared e-mail, a duplicated number):
// writing one member's details onto another is worse than leaving a gap.

export interface MatchableFonzipRow {
  membership_no?: number | string | null;
  email?: string | null;
}

export interface MatchableProfile {
  graduation_year: number | null;
  school_number: string | null;
  email: string | null;
}

export interface FonzipIndex<T> {
  byNo: Map<number, T[]>;
  byEmail: Map<string, T[]>;
}

const normalizeEmail = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function indexFonzipRows<T extends MatchableFonzipRow>(rows: T[]): FonzipIndex<T> {
  const byNo = new Map<number, T[]>();
  const byEmail = new Map<string, T[]>();
  for (const row of rows) {
    const no = Number(row.membership_no);
    if (Number.isFinite(no) && no > 0) push(byNo, no, row);
    const email = normalizeEmail(row.email);
    if (email) push(byEmail, email, row);
  }
  return { byNo, byEmail };
}

export interface FonzipMatch<T> {
  row: T;
  via: "membership_no" | "email";
}

export function matchProfileToFonzip<T extends MatchableFonzipRow>(
  profile: MatchableProfile,
  index: FonzipIndex<T>
): FonzipMatch<T> | null {
  const no =
    profile.graduation_year != null && profile.school_number
      ? buildFonzipMembershipNo(profile.graduation_year, profile.school_number)
      : null;
  const byNo = no != null ? index.byNo.get(no) : undefined;
  if (byNo) return byNo.length === 1 ? { row: byNo[0], via: "membership_no" } : null;

  const email = normalizeEmail(profile.email);
  const byEmail = email ? index.byEmail.get(email) : undefined;
  if (byEmail && byEmail.length === 1) return { row: byEmail[0], via: "email" };
  return null;
}
