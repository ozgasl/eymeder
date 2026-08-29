import nodemailer from "nodemailer";

const GMAIL_SENDER_EMAIL = "eymeder@gmail.com";

function getTransporter() {
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!appPassword) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_SENDER_EMAIL,
      pass: appPassword,
    },
  });
}

export type OtpEmailPurpose = "signup" | "password_reset";

export async function sendOtpEmail(toEmail: string, code: string, purpose: OtpEmailPurpose): Promise<void> {
  const subject = purpose === "signup"
    ? "EYMeder - Kayıt Doğrulama Kodunuz"
    : "EYMeder - Şifre Sıfırlama Kodunuz";

  const text = purpose === "signup"
    ? `EYMeder hesabınızı doğrulamak için kod: ${code}\n\nBu kod 10 dakika geçerlidir.`
    : `Şifrenizi sıfırlamak için kod: ${code}\n\nBu kod 10 dakika geçerlidir.`;

  const transporter = getTransporter();

  if (!transporter) {
    // No Gmail App Password configured yet (e.g. local development). Log
    // instead of sending so the rest of the signup/reset flow stays testable.
    console.warn(`[sendOtpEmail] GMAIL_APP_PASSWORD not set - would send to ${toEmail}: "${text}"`);
    return;
  }

  await transporter.sendMail({
    from: `EYMeder <${GMAIL_SENDER_EMAIL}>`,
    to: toEmail,
    subject,
    text,
  });
}
