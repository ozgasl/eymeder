// src/services/otpService.ts
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { generateOtpCode, hashOtpCode } from "@/lib/otp";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "signup" | "password_reset";

export async function issueOtpCode(
  email: string,
  purpose: OtpPurpose
): Promise<{ code: string } | { error: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: recent } = await supabaseAdmin
    .from("otp_codes")
    .select("created_at")
    .eq("email", normalizedEmail)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const secondsSinceLast = (Date.now() - new Date(recent.created_at as string).getTime()) / 1000;
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      return {
        error: `Lütfen ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)} saniye sonra tekrar deneyin.`,
      };
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, normalizedEmail);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("otp_codes").insert({
    email: normalizedEmail,
    code_hash: codeHash,
    purpose,
    expires_at: expiresAt,
  });

  if (error) {
    return { error: "Kod oluşturulamadı, lütfen tekrar deneyin." };
  }

  return { code };
}

export async function verifyOtpCode(
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ valid: true } | { valid: false; error: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const codeHash = hashOtpCode(code, normalizedEmail);

  const { data: row, error } = await supabaseAdmin
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts, consumed")
    .eq("email", normalizedEmail)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return { valid: false, error: "Kod bulunamadı, lütfen yeni kod isteyin." };
  }

  if (row.consumed) {
    return { valid: false, error: "Bu kod zaten kullanılmış, lütfen yeni kod isteyin." };
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { valid: false, error: "Kodun süresi doldu, lütfen yeni kod isteyin." };
  }

  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    return { valid: false, error: "Çok fazla yanlış deneme yapıldı, lütfen yeni kod isteyin." };
  }

  if (row.code_hash !== codeHash) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: (row.attempts as number) + 1 })
      .eq("id", row.id as string);
    return { valid: false, error: "Kod hatalı." };
  }

  await supabaseAdmin
    .from("otp_codes")
    .update({ consumed: true })
    .eq("id", row.id as string);

  return { valid: true };
}
