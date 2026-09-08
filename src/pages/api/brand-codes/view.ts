import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { campaignUnavailableReason, loadCampaign, loadUsage } from "@/lib/brandCodes";
import { isAuthError, requireDernekUyesi } from "@/lib/requireMember";

// Records that a member has revealed a brand's shared discount code.
//
// This is the only usage signal we can collect automatically: the discount is
// given at the brand's own till, so nothing tells us whether the member went
// on to actually use it. The admin panel therefore labels this figure
// "görüntüleyen" (revealed) and never as a redemption — a real redemption is
// only written by /api/admin/brand-codes/redeem.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireDernekUyesi(req);
  if (isAuthError(auth)) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { brandCodeId } = req.body ?? {};
  if (!brandCodeId || typeof brandCodeId !== "string") {
    return res.status(400).json({ error: "brandCodeId gerekli." });
  }

  try {
    const campaign = await loadCampaign(brandCodeId);
    if (!campaign) {
      return res.status(404).json({ error: "İndirim kodu bulunamadı." });
    }

    const unavailable = campaignUnavailableReason(campaign);
    if (unavailable) {
      return res.status(409).json({ error: unavailable });
    }

    const now = new Date().toISOString();
    const existing = await loadUsage(brandCodeId, auth.userId);

    if (!existing) {
      const { error } = await supabaseAdmin
        .from("brand_code_usages")
        .insert({ brand_code_id: brandCodeId, user_id: auth.userId, first_viewed_at: now });

      // A parallel request from the same member may have inserted the row
      // first (unique on brand_code_id+user_id) — that is not a failure.
      if (error && error.code !== "23505") throw new Error(error.message);
    } else if (!existing.first_viewed_at) {
      const { error } = await supabaseAdmin
        .from("brand_code_usages")
        .update({ first_viewed_at: now, updated_at: now })
        .eq("id", existing.id);

      if (error) throw new Error(error.message);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("brand code view failed:", error);
    return res.status(500).json({ error: "Kod görüntüleme kaydedilemedi." });
  }
}
