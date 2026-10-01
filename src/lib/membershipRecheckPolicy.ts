// When a member may re-run their own Fonzip check from the "dernek üyelerine
// özel" screen (/api/membership/recheck). Kept pure so the rules are tested
// without Fonzip or Supabase.

/**
 * Minimum gap between two checks of the same member. Measured from
 * `profiles.fonzip_checked_at`, which members can't write themselves (the
 * profiles trigger restores it — see 20260911100000_profiles_rls.sql), so the
 * limit can't be reset from the client. A lookup Fonzip never answered doesn't
 * stamp that column, so it doesn't start the cooldown either.
 */
export const SELF_RECHECK_COOLDOWN_MS = 5 * 60 * 1000;

export interface SelfRecheckProfile {
  membership_tier: string | null;
  fonzip_checked_at: string | null;
}

export type SelfRecheckGate =
  | { kind: "allowed" }
  | { kind: "already_member" }
  | { kind: "cooldown"; retryAfterMs: number };

export function selfRecheckGate(profile: SelfRecheckProfile, now: Date = new Date()): SelfRecheckGate {
  // A self-check only ever upgrades. A dernek_uyesi has nothing to gain from
  // it, and letting them run it could undo a tier staff set by hand
  // (/api/admin/membership-tier) — downgrades stay a staff decision.
  if (profile.membership_tier === "dernek_uyesi") {
    return { kind: "already_member" };
  }

  if (profile.fonzip_checked_at) {
    const checkedAt = new Date(profile.fonzip_checked_at).getTime();
    if (!Number.isNaN(checkedAt)) {
      const retryAfterMs = checkedAt + SELF_RECHECK_COOLDOWN_MS - now.getTime();
      if (retryAfterMs > 0) {
        return { kind: "cooldown", retryAfterMs };
      }
    }
  }

  return { kind: "allowed" };
}
