import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireStaff } from "@/lib/requireStaff";

const VALID_TIERS = ["dernek_uyesi", "mezun_uye"] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireStaff(req);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId, tier } = req.body as { userId?: string; tier?: string };

  if (!userId || !tier || !VALID_TIERS.includes(tier as typeof VALID_TIERS[number])) {
    return res.status(400).json({ error: "Geçersiz kullanıcı veya üyelik tipi." });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ membership_tier: tier })
    .eq("id", userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, tier });
}
