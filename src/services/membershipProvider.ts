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
  // profiles.fonzip_membership_status / fonzip_debt_status). null when the
  // lookup couldn't run at all (no membership_no, or the Fonzip call failed).
  membershipFound: boolean | null;
  hasDebt: boolean | null;
}

// Checks Fonzip (the association's membership/dues platform) for a matching,
// debt-free member. Fonzip's membership_no is graduationYear + schoolNumber
// zero-padded to 4 digits (see buildFonzipMembershipNo) - there's no separate
// "school number" field on the Fonzip side to match against directly.
// Any failure (missing credentials, network error, malformed response) is
// treated as "not a member" rather than propagated, per the design: a flaky
// Fonzip lookup should never block signup. isMember (and therefore
// membership_tier) still requires membershipFound && !hasDebt — only the
// visibility into which of the two failed is new.
export async function checkMembership(input: MembershipCheckInput): Promise<MembershipCheckResult> {
  const membershipNo = buildFonzipMembershipNo(input.graduationYear, input.schoolNumber);

  if (membershipNo === null) {
    return { isMember: false, membershipFound: null, hasDebt: null };
  }

  try {
    const result = await findFonzipMember(membershipNo);
    return {
      isMember: result.membershipFound && result.hasDebt === false,
      membershipFound: result.membershipFound,
      hasDebt: result.hasDebt,
    };
  } catch (error) {
    console.error("Fonzip membership check failed:", error);
    return { isMember: false, membershipFound: null, hasDebt: null };
  }
}

// Maps a tri-state Fonzip fact to the profiles.fonzip_*_status column values.
export function toFonzipStatus(value: boolean | null): "var" | "yok" | null {
  if (value === null) return null;
  return value ? "var" : "yok";
}
