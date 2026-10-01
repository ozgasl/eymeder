import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { isAuthError, requireSignedIn } from "@/lib/requireMember";
import { recheckFonzipMembership } from "@/lib/fonzipRecheck";
import { selfRecheckGate } from "@/lib/membershipRecheckPolicy";

// "Üyeliğimi tekrar kontrol et": a member who just paid their dues re-runs
// their own Fonzip check instead of waiting for staff to press "Fonzip yeniden
// kontrol". It only ever upgrades mezun_uye → dernek_uyesi; see
// selfRecheckGate for why it never downgrades and how often it may run.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireSignedIn(req);
  if (isAuthError(auth)) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, graduation_year, school_number, phone, email, membership_tier, fonzip_checked_at")
    .eq("id", auth.userId)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: "Profiliniz bulunamadı." });
  }

  const gate = selfRecheckGate(profile);
  if (gate.kind === "already_member") {
    return res.status(200).json({ tier: "dernek_uyesi" });
  }
  if (gate.kind === "cooldown") {
    const minutes = Math.ceil(gate.retryAfterMs / 60000);
    res.setHeader("Retry-After", String(Math.ceil(gate.retryAfterMs / 1000)));
    return res.status(429).json({
      error: `Üyeliğiniz az önce kontrol edildi. ${minutes} dakika sonra tekrar deneyebilirsiniz.`,
    });
  }

  const outcome = await recheckFonzipMembership(profile);

  if (outcome.kind === "missing_fields") {
    return res.status(400).json({
      error: "Profilinizde mezuniyet yılı veya okul numarası eksik olduğu için Fonzip'te arama yapılamıyor. Lütfen info@eymeder.com adresinden bize ulaşın.",
    });
  }

  if (outcome.kind === "no_answer") {
    return res.status(503).json({
      error: "Fonzip'ten şu anda yanıt alınamadı. Lütfen biraz sonra tekrar deneyin.",
    });
  }

  // Not a member yet: record the check (fresh tags, and it starts the
  // cooldown) but leave membership_tier alone, so a tier staff set by hand
  // between the gate above and this write is never overwritten.
  const { membership_tier, ...checkFields } = outcome.update;
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(outcome.isMember ? outcome.update : checkFields)
    .eq("id", auth.userId);

  if (updateError) {
    return res.status(500).json({ error: "Üyelik durumunuz kaydedilemedi, lütfen tekrar deneyin." });
  }

  return res.status(200).json({ tier: outcome.isMember ? membership_tier : "mezun_uye" });
}
