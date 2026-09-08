import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { campaignUnavailableReason, isCapReached, loadCampaign, loadUsage } from "@/lib/brandCodes";
import { buildMemberCode, computeMemberCodeExpiry } from "@/lib/discountCode";
import { isAuthError, requireDernekUyesi } from "@/lib/requireMember";

const MAX_CODE_ATTEMPTS = 5;

// Issues (or returns) the member's own single-use code for a campaign, e.g.
// EYB10 -> EYB10-7F3K2A. Idempotent: asking again returns the code the member
// already holds, so a reload never burns a code. An expired unredeemed code is
// replaced with a fresh one.
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
    if (!campaign.is_single_use) {
      return res.status(400).json({ error: "Bu kampanyada tüm üyeler aynı kodu kullanıyor." });
    }

    const unavailable = campaignUnavailableReason(campaign);
    if (unavailable) {
      return res.status(409).json({ error: unavailable });
    }

    const now = new Date();
    const existing = await loadUsage(brandCodeId, auth.userId);

    if (existing?.redeemed_at) {
      return res.status(409).json({
        error: "Bu kampanyadaki kodunuzu daha önce kullandınız.",
        code: existing.member_code,
        redeemedAt: existing.redeemed_at,
      });
    }

    const heldCode =
      existing?.member_code &&
      (!existing.expires_at || new Date(existing.expires_at).getTime() > now.getTime())
        ? existing
        : null;

    if (heldCode) {
      return res.status(200).json({
        code: heldCode.member_code,
        expiresAt: heldCode.expires_at,
        reissued: false,
      });
    }

    // A full campaign shouldn't hand out new codes, but members already
    // holding one keep it (handled above).
    if (await isCapReached(campaign)) {
      return res.status(409).json({ error: "Bu kampanyanın kontenjanı doldu." });
    }

    const expiresAt = computeMemberCodeExpiry(campaign.valid_until, now).toISOString();

    let usage = existing;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const memberCode = buildMemberCode(campaign.code);
      const payload = {
        member_code: memberCode,
        issued_at: now.toISOString(),
        expires_at: expiresAt,
        first_viewed_at: usage?.first_viewed_at ?? now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { error } = usage
        ? await supabaseAdmin.from("brand_code_usages").update(payload).eq("id", usage.id)
        : await supabaseAdmin
            .from("brand_code_usages")
            .insert({ brand_code_id: brandCodeId, user_id: auth.userId, ...payload });

      if (!error) {
        return res.status(200).json({ code: memberCode, expiresAt, reissued: Boolean(usage?.member_code) });
      }
      if (error.code !== "23505") throw new Error(error.message);

      // 23505 means either the generated code collided with another member's,
      // or a parallel request for this member inserted the usage row first.
      // Re-read before retrying so the second case updates instead of
      // insert-looping, and hand back a code that request already produced.
      usage = await loadUsage(brandCodeId, auth.userId);
      if (usage?.member_code && (!usage.expires_at || new Date(usage.expires_at).getTime() > now.getTime())) {
        return res.status(200).json({ code: usage.member_code, expiresAt: usage.expires_at, reissued: false });
      }
    }

    return res.status(503).json({ error: "Kod üretilemedi, lütfen tekrar deneyin." });
  } catch (error: any) {
    console.error("brand code issue failed:", error);
    return res.status(500).json({ error: "Kod üretilemedi." });
  }
}
