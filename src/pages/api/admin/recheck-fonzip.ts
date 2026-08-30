import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireStaff } from "@/lib/requireStaff";
import { checkMembership } from "@/services/membershipProvider";
import { withTimeout } from "@/lib/withTimeout";

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

  if (!profile.graduation_year || !profile.school_number) {
    return res.status(400).json({
      error: "Kullanıcının mezuniyet yılı veya okul numarası eksik, Fonzip'te aranamıyor.",
    });
  }

  const result = await withTimeout(
    checkMembership({
      fullName: profile.full_name || "",
      graduationYear: profile.graduation_year,
      schoolNumber: profile.school_number,
      phone: profile.phone || "",
      email: profile.email,
    }),
    8000,
    { isMember: false }
  );

  const tier = result.isMember ? "dernek_uyesi" : "mezun_uye";

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ membership_tier: tier })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ success: true, isMember: result.isMember, tier });
}
