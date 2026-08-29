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

// Mock until Fonzip API credentials are available — see
// docs/superpowers/specs/2026-08-29-member-onboarding-design.md. Swapping in
// the real Fonzip HTTP call means changing only this function's body; every
// caller already goes through withTimeout() and treats the result the same way.
export async function checkMembership(_input: MembershipCheckInput): Promise<MembershipCheckResult> {
  return { isMember: false };
}
