import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  campaignUnavailableReason,
  countRedemptions,
  loadCampaign,
  loadUsage,
  type BrandCodeUsage,
  type BrandDiscountCode,
} from "@/lib/brandCodes";
import { normalizeDiscountCode } from "@/lib/discountCode";
import { requireStaff } from "@/lib/requireStaff";

// Marks a discount code as actually used. This is the only place a redemption
// is recorded, and it always takes a human action: the brand (or an EYMeder
// volunteer) enters the code here at the moment the discount is given.
//
// Two shapes:
//   - single-use campaigns: the member's personal code (EYB10-7F3K2A) is
//     enough, it already identifies both the campaign and the member.
//   - shared campaigns: everyone uses the same code, so the member is
//     identified by their membership QR code (EYMDER-XXXXXXXX) as well.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireStaff(req);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { code, memberQrCode, note } = req.body as { code?: string; memberQrCode?: string; note?: string };
  const enteredCode = normalizeDiscountCode(code);
  if (!enteredCode) {
    return res.status(400).json({ error: "İndirim kodu gerekli." });
  }

  const now = new Date();
  const redeemNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : null;

  try {
    // 1. A personal single-use code?
    const { data: personalUsage } = await supabaseAdmin
      .from("brand_code_usages")
      .select("*")
      .ilike("member_code", enteredCode)
      .maybeSingle();

    if (personalUsage) {
      const usage = personalUsage as BrandCodeUsage;
      if (usage.redeemed_at) {
        return res.status(409).json({
          error: `Bu kod daha önce kullanılmış (${new Date(usage.redeemed_at).toLocaleString("tr-TR")}).`,
        });
      }
      if (usage.expires_at && new Date(usage.expires_at).getTime() < now.getTime()) {
        return res.status(409).json({ error: "Bu kodun süresi dolmuş." });
      }

      const campaign = await loadCampaign(usage.brand_code_id);
      if (!campaign) {
        return res.status(404).json({ error: "Kampanya bulunamadı." });
      }
      const unavailable = campaignUnavailableReason(campaign);
      if (unavailable) {
        return res.status(409).json({ error: unavailable });
      }
      if (campaign.max_redemptions && (await countRedemptions(campaign.id)) >= campaign.max_redemptions) {
        return res.status(409).json({ error: "Bu kampanyanın kontenjanı doldu." });
      }

      // `.is("redeemed_at", null)` makes this a no-op if a parallel request
      // redeemed the same code first, so check that a row actually changed
      // rather than reporting a redemption that didn't happen.
      const { data: updated, error } = await supabaseAdmin
        .from("brand_code_usages")
        .update({
          redeemed_at: now.toISOString(),
          redeemed_by: auth.userId,
          redeem_note: redeemNote,
          updated_at: now.toISOString(),
        })
        .eq("id", usage.id)
        .is("redeemed_at", null)
        .select("id");

      if (error) throw new Error(error.message);
      if (!updated || updated.length === 0) {
        return res.status(409).json({ error: "Bu kod az önce başka bir işlemde kullanıldı." });
      }

      return res.status(200).json(await describeRedemption(campaign.brand_id, usage.user_id, campaign, now));
    }

    // 2. A shared campaign code — then we also need to know which member.
    const { data: campaignRow } = await supabaseAdmin
      .from("brand_discount_codes")
      .select("*")
      .ilike("code", enteredCode)
      .maybeSingle();

    if (!campaignRow) {
      return res.status(404).json({ error: "Bu indirim kodu bulunamadı." });
    }

    const campaign = campaignRow as BrandDiscountCode;
    if (campaign.is_single_use) {
      return res.status(400).json({
        error: "Bu kampanyada her üyenin kendine ait bir kodu var. Üyenin kişisel kodunu girin.",
      });
    }

    const unavailable = campaignUnavailableReason(campaign);
    if (unavailable) {
      return res.status(409).json({ error: unavailable });
    }

    const qrCode = normalizeDiscountCode(memberQrCode);
    if (!qrCode) {
      return res.status(400).json({ error: "Bu kodu tüm üyeler kullanıyor; üyenin QR kodunu da girin." });
    }

    const { data: qrRow } = await supabaseAdmin
      .from("user_qr_codes")
      .select("user_id")
      .ilike("qr_code", qrCode)
      .maybeSingle();

    if (!qrRow) {
      return res.status(404).json({ error: "Bu QR koduna sahip üye bulunamadı." });
    }
    const memberId = (qrRow as { user_id: string }).user_id;

    const { data: memberProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, membership_tier")
      .eq("id", memberId)
      .single();

    if ((memberProfile as { membership_tier?: string } | null)?.membership_tier !== "dernek_uyesi") {
      return res.status(403).json({ error: "Bu üye dernek üyesi değil, indirim kodunu kullanamaz." });
    }

    if (campaign.max_redemptions && (await countRedemptions(campaign.id)) >= campaign.max_redemptions) {
      return res.status(409).json({ error: "Bu kampanyanın kontenjanı doldu." });
    }

    const existing = await loadUsage(campaign.id, memberId);
    if (existing?.redeemed_at) {
      return res.status(409).json({
        error: `Bu üye bu kodu daha önce kullandı (${new Date(existing.redeemed_at).toLocaleString("tr-TR")}).`,
      });
    }

    const redemption = {
      redeemed_at: now.toISOString(),
      redeemed_by: auth.userId,
      redeem_note: redeemNote,
      updated_at: now.toISOString(),
    };

    const { error } = existing
      ? await supabaseAdmin
          .from("brand_code_usages")
          .update(redemption)
          .eq("id", existing.id)
          .is("redeemed_at", null)
      : await supabaseAdmin
          .from("brand_code_usages")
          .insert({ brand_code_id: campaign.id, user_id: memberId, ...redemption });

    // 23505: a parallel request created this member's usage row first.
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Bu üye bu kodu az önce kullandı." });
    }
    if (error) throw new Error(error.message);

    return res.status(200).json(await describeRedemption(campaign.brand_id, memberId, campaign, now));
  } catch (error: any) {
    console.error("brand code redeem failed:", error);
    return res.status(500).json({ error: "Kod kullanımı kaydedilemedi." });
  }
}

async function describeRedemption(
  brandId: string,
  memberId: string,
  campaign: { code: string; label: string | null; discount_info: string | null },
  now: Date,
) {
  const [{ data: brand }, { data: member }] = await Promise.all([
    supabaseAdmin.from("brands").select("name, discount_info").eq("id", brandId).single(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", memberId).single(),
  ]);

  return {
    success: true,
    brandName: (brand as { name?: string } | null)?.name ?? "",
    memberName: (member as { full_name?: string } | null)?.full_name ?? "",
    discountInfo: campaign.discount_info || (brand as { discount_info?: string } | null)?.discount_info || "",
    label: campaign.label,
    code: campaign.code,
    redeemedAt: now.toISOString(),
  };
}
