import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { authService, type AuthUser } from "@/services/authService";

export type MembershipTier = "dernek_uyesi" | "mezun_uye";
export type StaffRole = "admin" | "moderator" | "member";

export interface AccessControlState {
  loading: boolean;
  user: AuthUser | null;
  tier: MembershipTier;
  role: StaffRole;
  isDernekUyesi: boolean;
  isStaff: boolean;
}

interface UseAccessControlOptions {
  /** Redirect to /auth/login when there is no session. Defaults to true. */
  redirectIfUnauthenticated?: boolean;
}

const INITIAL_STATE: AccessControlState = {
  loading: true,
  user: null,
  tier: "mezun_uye",
  role: "member",
  isDernekUyesi: false,
  isStaff: false,
};

/**
 * Central place to read a signed-in user's membership tier (mezun_uye /
 * dernek_uyesi) and staff role (admin / moderator / member) for feature
 * gating. Tier gates dues-linked perks; role gates official-content and
 * admin tooling — the two are independent.
 */
export function useAccessControl(options: UseAccessControlOptions = {}): AccessControlState {
  const { redirectIfUnauthenticated = true } = options;
  const router = useRouter();
  const [state, setState] = useState<AccessControlState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        if (redirectIfUnauthenticated) router.push("/auth/login");
        if (active) setState({ ...INITIAL_STATE, loading: false });
        return;
      }

      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("membership_tier").eq("id", user.id).single(),
        supabase.from("roles").select("role").eq("user_id", user.id).single(),
      ]);

      const tier = ((profile as any)?.membership_tier as MembershipTier) || "mezun_uye";
      const role = ((roleRow as any)?.role as StaffRole) || "member";

      if (active) {
        setState({
          loading: false,
          user,
          tier,
          role,
          isDernekUyesi: tier === "dernek_uyesi",
          isStaff: role === "admin" || role === "moderator",
        });
      }
    };

    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
