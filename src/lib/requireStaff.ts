import type { NextApiRequest } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";

export interface StaffAuthResult {
  userId: string;
}

export interface StaffAuthError {
  error: string;
  status: number;
}

// Verifies the request's bearer token belongs to a signed-in admin/moderator.
// Server-only: relies on the service-role client to look up the session and
// the roles table, bypassing RLS by design.
export async function requireStaff(req: NextApiRequest): Promise<StaffAuthResult | StaffAuthError> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: "Giriş yapmanız gerekiyor.", status: 401 };
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return { error: "Geçersiz oturum.", status: 401 };
  }

  const { data: roleRow } = await supabaseAdmin
    .from("roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleRow || (roleRow.role !== "admin" && roleRow.role !== "moderator")) {
    return { error: "Bu işlem için yetkiniz yok.", status: 403 };
  }

  return { userId: user.id };
}
