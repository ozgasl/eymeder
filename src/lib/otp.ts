import { randomInt, createHash } from "crypto";

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string, email: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}
