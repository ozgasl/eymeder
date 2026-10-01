import { checkMembership, toFonzipStatus, formatFonzipTags } from "@/services/membershipProvider";
import { withTimeout } from "@/lib/withTimeout";

// One Fonzip re-check of an existing profile, shared by the staff action
// (/api/admin/recheck-fonzip) and the member's own button
// (/api/membership/recheck). Server-only. Callers decide whether to write the
// result — the member route, for one, only ever writes an upgrade.

export interface RecheckProfile {
  full_name: string | null;
  graduation_year: number | null;
  school_number: string | null;
  phone: string | null;
  email: string;
}

export interface MembershipUpdate {
  membership_tier: "dernek_uyesi" | "mezun_uye";
  fonzip_membership_status: "var" | "yok" | null;
  fonzip_tags: string | null;
  fonzip_checked_at: string;
}

export type RecheckOutcome =
  | { kind: "missing_fields" }
  | { kind: "no_answer" }
  | { kind: "answered"; isMember: boolean; update: MembershipUpdate };

export async function recheckFonzipMembership(profile: RecheckProfile): Promise<RecheckOutcome> {
  if (!profile.graduation_year || !profile.school_number) {
    return { kind: "missing_fields" };
  }

  const result = await withTimeout(
    checkMembership({
      fullName: profile.full_name || "",
      graduationYear: profile.graduation_year,
      schoolNumber: profile.school_number,
      phone: profile.phone || "",
      email: profile.email,
    }),
    8000,
    { isMember: false, membershipFound: null, tags: [] }
  );

  // membershipFound === null means the lookup never produced an answer: it
  // threw, or it outran the timeout above. That is NOT "no matching member" —
  // writing it as one downgraded real dernek_uyesi members to mezun_uye and
  // wiped their recorded tags, purely because Fonzip was slow. Callers must
  // leave the profile exactly as it was.
  if (result.membershipFound === null) {
    return { kind: "no_answer" };
  }

  return {
    kind: "answered",
    isMember: result.isMember,
    update: {
      membership_tier: result.isMember ? "dernek_uyesi" : "mezun_uye",
      fonzip_membership_status: toFonzipStatus(result.membershipFound),
      fonzip_tags: formatFonzipTags(result.tags),
      fonzip_checked_at: new Date().toISOString(),
    },
  };
}
