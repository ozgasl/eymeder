import nodemailer from "nodemailer";

const GMAIL_SENDER_EMAIL = "eymeder@gmail.com";
const ADMIN_NOTIFICATION_EMAIL = "info@eymeder.com";

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

export interface NewMemberNotificationInput {
  fullName: string;
  email: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
}

export async function sendNewMemberNotification(input: NewMemberNotificationInput): Promise<void> {
  const transporter = getTransporter();

  const text = [
    "Uygulamaya yeni bir üye kaydoldu.",
    "",
    `Ad Soyad: ${input.fullName}`,
    `E-posta: ${input.email}`,
    `Mezuniyet Yılı: ${input.graduationYear}`,
    `Okul Numarası: ${input.schoolNumber}`,
    `Telefon: ${input.phone}`,
  ].join("\n");

  if (!transporter) {
    console.warn(`[sendNewMemberNotification] GMAIL_APP_PASSWORD not set - would send to ${ADMIN_NOTIFICATION_EMAIL}: "${text}"`);
    return;
  }

  await transporter.sendMail({
    from: `EYMeder <${GMAIL_SENDER_EMAIL}>`,
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: "Yeni Üye Kaydı",
    text,
  });
}
