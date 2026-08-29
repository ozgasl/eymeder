// src/pages/api/auth/request-code.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { issueOtpCode } from "@/services/otpService";
import { sendOtpEmail } from "@/lib/mailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, purpose } = req.body as { email?: string; purpose?: string };

  if (!email || (purpose !== "signup" && purpose !== "password_reset")) {
    return res.status(400).json({ error: "Geçersiz istek." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (purpose === "signup" && existingProfile) {
    return res.status(400).json({ error: "Bu e-posta ile zaten bir hesap var, giriş yapmayı deneyin." });
  }

  if (purpose === "password_reset" && !existingProfile) {
    return res.status(400).json({ error: "Bu e-posta ile kayıtlı bir hesap bulunamadı." });
  }

  const issued = await issueOtpCode(normalizedEmail, purpose);
  if ("error" in issued) {
    return res.status(429).json({ error: issued.error });
  }

  await sendOtpEmail(normalizedEmail, issued.code, purpose);

  return res.status(200).json({ success: true });
}
