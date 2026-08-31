import { buildFonzipMembershipNo } from "@/lib/fonzipMembershipNo";
import { findFonzipMember } from "@/lib/fonzipClient";

export interface MembershipCheckInput {
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  email: string;
}

export interface MembershipCheckResult {
  isMember: boolean;
  // Raw facts behind isMember, kept separate for display/diagnosis (see
  // profiles.fonzip_membership_status / fonzip_tags). null when the lookup
  // couldn't run at all (no membership_no, or the Fonzip call failed).
  membershipFound: boolean | null;
  tags: string[];
}

// A member tagged with either of these in Fonzip is dernek_uyesi, regardless
// of what else they're tagged with (most members carry both an active-status
// tag and "Mezun Üye" at once, since the latter just marks school alumnus
// status). Everyone else - "Mezun Üye"/"Bağışçı"/"Fahri Üye" alone, or no
// tags at all - is mezun_uye.
const DERNEK_UYESI_TAG_NAMES = ["Dernek Üyesi", "Yönetim"];

// Checks Fonzip (the association's membership/dues platform) for a matching
// member and reads their Fonzip tags to decide dernek_uyesi vs mezun_uye.
// Fonzip's membership_no is graduationYear + schoolNumber zero-padded to 4
// digits (see buildFonzipMembershipNo) - there's no separate "school number"
// field on the Fonzip side to match against directly. Any failure (missing
// credentials, network error, malformed response) is treated as "not a
// member" rather than propagated, per the design: a flaky Fonzip lookup
// should never block signup.
export async function checkMembership(input: MembershipCheckInput): Promise<MembershipCheckResult> {
  const membershipNo = buildFonzipMembershipNo(input.graduationYear, input.schoolNumber);

  if (membershipNo === null) {
    return { isMember: false, membershipFound: null, tags: [] };
  }

  try {
    const result = await findFonzipMember(membershipNo);
    return {
      isMember: result.tags.some((tag) => DERNEK_UYESI_TAG_NAMES.includes(tag)),
      membershipFound: result.membershipFound,
      tags: result.tags,
    };
  } catch (error) {
    console.error("Fonzip membership check failed:", error);
    return { isMember: false, membershipFound: null, tags: [] };
  }
}

// Maps a tri-state Fonzip fact to the profiles.fonzip_membership_status column value.
export function toFonzipStatus(value: boolean | null): "var" | "yok" | null {
  if (value === null) return null;
  return value ? "var" : "yok";
}

// Maps raw Fonzip tag names to the profiles.fonzip_tags column value.
export function formatFonzipTags(tags: string[]): string | null {
  return tags.length > 0 ? tags.join(", ") : null;
}
