// src/pages/api/auth/verify-code.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { verifyOtpCode } from "@/services/otpService";
import { checkMembership, toFonzipStatus, formatFonzipTags } from "@/services/membershipProvider";
import { withTimeout } from "@/lib/withTimeout";
import { sendNewMemberNotification } from "@/lib/mailer";

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
    { isMember: false, membershipFound: null, tags: [] }
  );

  const profileUpdate = {
    full_name: fullName,
    graduation_year: graduationYear,
    school_number: schoolNumber,
    phone,
    membership_tier: membershipResult.isMember ? "dernek_uyesi" : "mezun_uye",
    fonzip_membership_status: toFonzipStatus(membershipResult.membershipFound),
    fonzip_tags: formatFonzipTags(membershipResult.tags),
    // Only stamp the check when Fonzip actually answered. A signup must never
    // be blocked by a slow lookup (hence the timeout fallback above), but
    // recording a non-answer as a completed check made those profiles read
    // "checked, no membership" when nothing had been established — an admin
    // needs to see them as unchecked so they get looked at again.
    ...(membershipResult.membershipFound === null
      ? {}
      : { fonzip_checked_at: new Date().toISOString() }),
  } as const;

  // graduation_year and school_number only ever reach the profile through this
  // update (members can't edit them afterwards), so a failed write used to leave
  // an account that signed up "successfully" with both empty and no way to ever
  // match Fonzip. Retry once, and if it still fails undo the signup so the
  // member can start over instead of ending up half-registered.
  let profileError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { error } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", createdUser.user.id);
    profileError = error;
    if (!error) break;
    console.error(`Profile update error after signup (attempt ${attempt}):`, error);
  }

  if (profileError) {
    await supabaseAdmin.from("profiles").delete().eq("id", createdUser.user.id);
    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);
    if (rollbackError) {
      console.error("Signup rollback failed, account left without profile data:", createdUser.user.id, rollbackError);
    }
    return res.status(500).json({
      error: "Kaydınız tamamlanamadı, hesap oluşturulmadı. Lütfen yeni kod isteyip tekrar deneyin.",
    });
  }

  try {
    await sendNewMemberNotification({ fullName, email: normalizedEmail, graduationYear, schoolNumber, phone });
  } catch (notificationError) {
    console.error("New member notification email failed:", notificationError);
  }

  return res.status(200).json({ success: true });
}
