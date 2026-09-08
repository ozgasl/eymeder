import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import {
  campaignUnavailableReason,
  countMemberRedemptions,
  countRedemptions,
  lastMemberRedemptionAt,
  loadCampaign,
  loadUsage,
  type BrandCodeUsage,
  type BrandDiscountCode,
} from "@/lib/brandCodes";
import { isDuplicateRedemption, normalizeDiscountCode } from "@/lib/discountCode";
import { requireStaff } from "@/lib/requireStaff";

// Marks a discount code as actually used. This is the only place a redemption
// is recorded, and it always takes a human action: the brand (or an EYMeder
// volunteer) enters the code here at the moment the discount is given.
//
// Two shapes:
//   - single-use campaigns: the member's personal code (EYB10-7F3K2A) is
//     enough, it already identifies both the campaign and the member, and it
//     can only be used once.
//   - shared campaigns: everyone uses the same code, so the member is
//     identified by their membership QR code (EYMDER-XXXXXXXX). Repeat use is
//     normal here (a member visits the same café again), so each use is its
//     own row in `brand_code_redemptions` and all of them count.
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
      // spent the same personal code first, so check that a row actually
      // changed before writing the redemption to the ledger.
      const { data: updated, error: spendError } = await supabaseAdmin
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

      if (spendError) throw new Error(spendError.message);
      if (!updated || updated.length === 0) {
        return res.status(409).json({ error: "Bu kod az önce başka bir işlemde kullanıldı." });
      }

      await recordRedemption({
        brandCodeId: campaign.id,
        userId: usage.user_id,
        usageId: usage.id,
        codeUsed: usage.member_code ?? campaign.code,
        redeemedBy: auth.userId,
        note: redeemNote,
        now,
      });

      return res.status(200).json(await describeRedemption(campaign, usage.user_id, now));
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

    // The QR value is typed in by hand and goes into an ilike pattern, so
    // strip anything that isn't part of a real QR code (% and _ are wildcards).
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
      .select("membership_tier")
      .eq("id", memberId)
      .single();

    if ((memberProfile as { membership_tier?: string } | null)?.membership_tier !== "dernek_uyesi") {
      return res.status(403).json({ error: "Bu üye dernek üyesi değil, indirim kodunu kullanamaz." });
    }

    if (campaign.max_redemptions && (await countRedemptions(campaign.id)) >= campaign.max_redemptions) {
      return res.status(409).json({ error: "Bu kampanyanın kontenjanı doldu." });
    }

    // Repeat use is allowed and counted; only an accidental double entry is
    // refused (see DUPLICATE_REDEMPTION_WINDOW_MS).
    const lastUse = await lastMemberRedemptionAt(campaign.id, memberId);
    if (isDuplicateRedemption(lastUse, now)) {
      return res.status(409).json({
        error: `Bu üye bu kodu az önce kullandı (${new Date(lastUse!).toLocaleTimeString("tr-TR")}). Aynı satış iki kez kaydedilmesin diye tekrar kaydedilmedi.`,
      });
    }

    const usageId = await ensureUsageRow(campaign.id, memberId, now);
    await recordRedemption({
      brandCodeId: campaign.id,
      userId: memberId,
      usageId,
      codeUsed: campaign.code,
      redeemedBy: auth.userId,
      note: redeemNote,
      now,
    });

    // The usage row tracks the member's latest use of this campaign; the
    // ledger above is what the counters are computed from.
    if (usageId) {
      await supabaseAdmin
        .from("brand_code_usages")
        .update({
          redeemed_at: now.toISOString(),
          redeemed_by: auth.userId,
          redeem_note: redeemNote,
          updated_at: now.toISOString(),
        })
        .eq("id", usageId);
    }

    return res.status(200).json(await describeRedemption(campaign, memberId, now));
  } catch (error: any) {
    console.error("brand code redeem failed:", error);
    return res.status(500).json({ error: "Kod kullanımı kaydedilemedi." });
  }
}

/** Returns the member's state row for a campaign, creating it if this is their first contact. */
async function ensureUsageRow(brandCodeId: string, userId: string, now: Date): Promise<string | null> {
  const existing = await loadUsage(brandCodeId, userId);
  if (existing) return existing.id;

  // A member can be redeemed for without ever opening the app, so this row may
  // not exist yet. `first_viewed_at` stays null on purpose — they didn't view it.
  const { data, error } = await supabaseAdmin
    .from("brand_code_usages")
    .insert({ brand_code_id: brandCodeId, user_id: userId, created_at: now.toISOString() })
    .select("id")
    .maybeSingle();

  // 23505: a parallel request created it first.
  if (error?.code === "23505") {
    return (await loadUsage(brandCodeId, userId))?.id ?? null;
  }
  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

async function recordRedemption(input: {
  brandCodeId: string;
  userId: string;
  usageId: string | null;
  codeUsed: string;
  redeemedBy: string;
  note: string | null;
  now: Date;
}) {
  const { error } = await supabaseAdmin.from("brand_code_redemptions").insert({
    brand_code_id: input.brandCodeId,
    user_id: input.userId,
    usage_id: input.usageId,
    code_used: input.codeUsed,
    redeemed_at: input.now.toISOString(),
    redeemed_by: input.redeemedBy,
    note: input.note,
  });

  if (error) throw new Error(error.message);
}

async function describeRedemption(campaign: BrandDiscountCode, memberId: string, now: Date) {
  const [{ data: brand }, { data: member }, memberUseCount, totalUseCount] = await Promise.all([
    supabaseAdmin.from("brands").select("name, discount_info").eq("id", campaign.brand_id).single(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", memberId).single(),
    countMemberRedemptions(campaign.id, memberId),
    countRedemptions(campaign.id),
  ]);

  return {
    success: true,
    brandName: (brand as { name?: string } | null)?.name ?? "",
    memberName: (member as { full_name?: string } | null)?.full_name ?? "",
    discountInfo: campaign.discount_info || (brand as { discount_info?: string } | null)?.discount_info || "",
    label: campaign.label,
    code: campaign.code,
    redeemedAt: now.toISOString(),
    memberUseCount,
    totalUseCount,
  };
}
