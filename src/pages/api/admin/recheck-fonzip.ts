import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireStaff } from "@/lib/requireStaff";
import { recheckFonzipMembership } from "@/lib/fonzipRecheck";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireStaff(req);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId } = req.body as { userId?: string };
  if (!userId) {
    return res.status(400).json({ error: "Kullanıcı gerekli." });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("full_name, graduation_year, school_number, phone, email")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı." });
  }

  const outcome = await recheckFonzipMembership(profile);

  if (outcome.kind === "missing_fields") {
    return res.status(400).json({
      error: "Kullanıcının mezuniyet yılı veya okul numarası eksik, Fonzip'te aranamıyor.",
    });
  }

  if (outcome.kind === "no_answer") {
    return res.status(503).json({
      error: "Fonzip'ten yanıt alınamadı, üyenin kaydı değiştirilmedi. Lütfen tekrar deneyin.",
    });
  }

  const { update } = outcome;
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({
    success: true,
    isMember: outcome.isMember,
    tier: update.membership_tier,
    membershipStatus: update.fonzip_membership_status,
    fonzipTags: update.fonzip_tags,
  });
}
