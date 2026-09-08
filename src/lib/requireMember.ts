import type { NextApiRequest } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";

export interface MemberAuthResult {
  userId: string;
}

export interface MemberAuthError {
  error: string;
  status: number;
}

export function isAuthError<T extends object>(result: T | MemberAuthError): result is MemberAuthError {
  return "error" in result;
}

// Verifies the request's bearer token belongs to a signed-in dernek_uyesi —
// the tier that dues-linked perks (discount codes) are gated on. Server-only:
// uses the service-role client, so it bypasses RLS by design.
export async function requireDernekUyesi(req: NextApiRequest): Promise<MemberAuthResult | MemberAuthError> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: "Giriş yapmanız gerekiyor.", status: 401 };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return { error: "Geçersiz oturum.", status: 401 };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("membership_tier")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as { membership_tier?: string }).membership_tier !== "dernek_uyesi") {
    return { error: "İndirim kodları dernek üyelerine özeldir.", status: 403 };
  }

  return { userId: user.id };
}
