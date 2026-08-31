// src/pages/api/auth/verify-code.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { verifyOtpCode } from "@/services/otpService";
import { checkMembership, toFonzipStatus } from "@/services/membershipProvider";
import { withTimeout } from "@/lib/withTimeout";

interface VerifySignupBody {
  email: string;
  code: string;
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  password: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, code, fullName, graduationYear, schoolNumber, phone, password } = req.body as VerifySignupBody;

  if (!email || !code || !fullName || !graduationYear || !schoolNumber || !phone || !password) {
    return res.status(400).json({ error: "Eksik alan var." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const verification = await verifyOtpCode(normalizedEmail, code, "signup");
  if ("error" in verification) {
    return res.status(400).json({ error: verification.error });
  }

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !createdUser?.user) {
    return res.status(400).json({
      error: createError?.message === "User already registered"
        ? "Bu e-posta ile zaten bir hesap var, giriş yapmayı deneyin."
        : (createError?.message || "Hesap oluşturulamadı."),
    });
  }

  const membershipResult = await withTimeout(
    checkMembership({
      fullName,
      graduationYear,
      schoolNumber,
      phone,
      email: normalizedEmail,
    }),
    8000,
    { isMember: false, membershipFound: null, hasDebt: null }
  );

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      graduation_year: graduationYear,
      school_number: schoolNumber,
      phone,
      membership_tier: membershipResult.isMember ? "dernek_uyesi" : "mezun_uye",
      fonzip_membership_status: toFonzipStatus(membershipResult.membershipFound),
      fonzip_debt_status: toFonzipStatus(membershipResult.hasDebt),
      fonzip_checked_at: new Date().toISOString(),
    })
    .eq("id", createdUser.user.id);

  if (profileError) {
    console.error("Profile update error after signup:", profileError);
  }

  return res.status(200).json({ success: true });
}
