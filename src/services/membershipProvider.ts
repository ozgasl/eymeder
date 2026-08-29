import { buildFonzipMembershipNo } from "@/lib/fonzipMembershipNo";
import { findFonzipMemberInGoodStanding } from "@/lib/fonzipClient";

export interface MembershipCheckInput {
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  email: string;
}

export interface MembershipCheckResult {
  isMember: boolean;
}

// Checks Fonzip (the association's membership/dues platform) for a matching,
// debt-free member. Fonzip's membership_no is graduationYear + schoolNumber
// zero-padded to 4 digits (see buildFonzipMembershipNo) - there's no separate
// "school number" field on the Fonzip side to match against directly.
// Any failure (missing credentials, network error, malformed response) is
// treated as "not a member" rather than propagated, per the design: a flaky
// Fonzip lookup should never block signup.
export async function checkMembership(input: MembershipCheckInput): Promise<MembershipCheckResult> {
  const membershipNo = buildFonzipMembershipNo(input.graduationYear, input.schoolNumber);

  if (membershipNo === null) {
    return { isMember: false };
  }

  try {
    const result = await findFonzipMemberInGoodStanding(membershipNo);
    return { isMember: result.found };
  } catch (error) {
    console.error("Fonzip membership check failed:", error);
    return { isMember: false };
  }
}
