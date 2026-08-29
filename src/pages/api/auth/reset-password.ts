// src/pages/api/auth/reset-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { verifyOtpCode } from "@/services/otpService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };

  if (!email || !code || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Eksik veya geçersiz alan." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const verification = await verifyOtpCode(normalizedEmail, code, "password_reset");
  if ("error" in verification) {
    return res.status(400).json({ error: verification.error });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(400).json({ error: "Hesap bulunamadı." });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    return res.status(500).json({ error: "Şifre güncellenemedi." });
  }

  return res.status(200).json({ success: true });
}
