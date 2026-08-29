# Member Onboarding & Access Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the membership-number-gated signup with open registration (email OTP verification, from `eymeder@gmail.com`), automatic `dernek_uyesi`/`mezun_uye` role assignment via a (initially mocked) Fonzip membership check, and a mandatory `/welcome` entry gate in front of the whole app.

**Architecture:** A custom 6-digit-code system (own DB table, own Gmail-SMTP sender) backs both signup verification and password reset — one mechanism, two purposes. Account creation and role assignment happen server-side in Next.js API routes using the Supabase **service role** key (never exposed to the browser). Membership-tier lookup is behind a `membershipProvider` interface so the real Fonzip call can be dropped in later without touching anything else. A client-side gate in `_app.tsx` redirects any unauthenticated request to `/welcome`, which is also what fixes the original "menu invisible" bug (removes `Navigation.tsx`'s `if (!user) return null`).

**Tech Stack:** Next.js 15 (Pages Router) + TypeScript, Supabase (Postgres + Auth), Nodemailer (Gmail SMTP), Vitest (new — this repo has no test framework; added narrowly for the new pure-logic modules, since the codebase's existing testing story is "none" and the rest of this feature is verified manually per the approved spec's Testing Plan).

**Spec:** `docs/superpowers/specs/2026-08-29-member-onboarding-design.md`

---

## Before You Start — Required Secrets

Two secrets must exist before certain tasks will work end-to-end. Tasks note where they're needed; nothing blocks on them until then.

1. `SUPABASE_SERVICE_ROLE_KEY` — from the Supabase Dashboard → Project Settings → API → `service_role` secret (project `nbfwziahigjweosgtajo`). Add to `.env.local` (and Vercel) as `SUPABASE_SERVICE_ROLE_KEY=...`. **Never share this key in chat/PRs** — it bypasses Row Level Security entirely.
2. `GMAIL_APP_PASSWORD` — a Gmail "App Password" generated in the `eymeder@gmail.com` Google Account (Security → 2-Step Verification → App Passwords). Add to `.env.local` (and Vercel) as `GMAIL_APP_PASSWORD=...`. Until this is set, `sendOtpEmail` logs the code to the console instead of emailing it (see Task 7) — this keeps every other task testable without the real credential.

---

### Task 1: Database Migration + Regenerated Types

**Files:**
- Create: `supabase/migrations/20260829120000_member_onboarding_access_gate.sql`
- Modify: `src/integrations/supabase/database.types.ts` (regenerated, not hand-edited)

- [ ] **Step 1: Write the migration**

```sql
-- Member onboarding & access gate: schema changes.
-- See docs/superpowers/specs/2026-08-29-member-onboarding-design.md

-- Retire the old membership-number-gated signup path. No real data depends on
-- this (verified live: membership_numbers held 1 unused test row).
ALTER TABLE profiles DROP COLUMN IF EXISTS membership_number;
DROP TABLE IF EXISTS membership_numbers;

-- New profile fields for the open-registration flow.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school_number TEXT,
  ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'mezun_uye'
    CHECK (membership_tier IN ('dernek_uyesi', 'mezun_uye'));

-- One-time-code table backing both signup verification and password reset.
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_otp_codes_email_purpose ON otp_codes(email, purpose, created_at DESC);

-- No public policies: this table is only ever touched by the service-role
-- client from server-side API routes, which bypasses RLS entirely.
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply the migration to the remote database**

```bash
DB_PASS=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d= -f2-)
npx --yes supabase db push --db-url "postgresql://postgres:${DB_PASS}@db.nbfwziahigjweosgtajo.supabase.co:5432/postgres"
```

Expected: output lists `20260829120000_member_onboarding_access_gate.sql` as applied, no errors.

- [ ] **Step 3: Verify the schema change**

```bash
DB_PASS=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d= -f2-)
npx --yes supabase migration list --db-url "postgresql://postgres:${DB_PASS}@db.nbfwziahigjweosgtajo.supabase.co:5432/postgres"
```

Expected: the new version's `local` and `remote` columns match, same as every other row.

- [ ] **Step 4: Regenerate TypeScript types**

```bash
DB_PASS=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d= -f2-)
npx --yes supabase gen types typescript --db-url "postgresql://postgres:${DB_PASS}@db.nbfwziahigjweosgtajo.supabase.co:5432/postgres" --schema public > src/integrations/supabase/database.types.ts
```

Expected: the file is rewritten; `grep -c membership_numbers src/integrations/supabase/database.types.ts` returns `0`; `grep -c otp_codes src/integrations/supabase/database.types.ts` returns a number greater than `0`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260829120000_member_onboarding_access_gate.sql src/integrations/supabase/database.types.ts
git commit -m "Add member onboarding schema: otp_codes, membership_tier, drop membership_numbers"
```

---

### Task 2: Test Tooling (Vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Add the test script**

In `package.json`, inside `"scripts"`, add:

```json
    "test": "vitest run",
```

(Placed after the existing `"lint": "next lint"` line, keeping the trailing comma pattern consistent with the rest of the block.)

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Verify the runner works with no tests yet**

```bash
npm test
```

Expected: Vitest reports `No test files found` (or similar) and exits — this just confirms the runner is wired up before Task 3 adds real tests.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Add Vitest for the new onboarding pure-logic modules"
```

---

### Task 3: OTP Core Logic (`src/lib/otp.ts`)

**Files:**
- Create: `src/lib/otp.ts`
- Test: `src/lib/otp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/otp.test.ts
import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode } from "./otp";

describe("generateOtpCode", () => {
  it("always returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("produces the same hash for the same code and email", () => {
    const a = hashOtpCode("123456", "test@example.com");
    const b = hashOtpCode("123456", "test@example.com");
    expect(a).toBe(b);
  });

  it("is case-insensitive on the email", () => {
    const a = hashOtpCode("123456", "Test@Example.com");
    const b = hashOtpCode("123456", "test@example.com");
    expect(a).toBe(b);
  });

  it("produces a different hash for a different code", () => {
    const a = hashOtpCode("123456", "test@example.com");
    const b = hashOtpCode("654321", "test@example.com");
    expect(a).not.toBe(b);
  });

  it("produces a different hash for a different email", () => {
    const a = hashOtpCode("123456", "a@example.com");
    const b = hashOtpCode("123456", "b@example.com");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/otp.test.ts
```

Expected: FAIL — `Cannot find module './otp'` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/otp.ts
import { randomInt, createHash } from "crypto";

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string, email: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/otp.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/otp.ts src/lib/otp.test.ts
git commit -m "Add OTP code generation and hashing logic"
```

---

### Task 4: Timeout Utility (`src/lib/withTimeout.ts`)

**Files:**
- Create: `src/lib/withTimeout.ts`
- Test: `src/lib/withTimeout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/withTimeout.test.ts
import { describe, it, expect } from "vitest";
import { withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  it("resolves with the original value when the promise settles before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("fast"), 1000, "fallback");
    expect(result).toBe("fast");
  });

  it("resolves with the fallback when the promise takes longer than the timeout", async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("slow"), 50));
    const result = await withTimeout(slow, 10, "fallback");
    expect(result).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/withTimeout.test.ts
```

Expected: FAIL — `Cannot find module './withTimeout'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/withTimeout.ts
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timer!);
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/withTimeout.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/withTimeout.ts src/lib/withTimeout.test.ts
git commit -m "Add withTimeout utility for bounding external calls"
```

---

### Task 5: Membership Provider (Mock Fonzip Integration)

**Files:**
- Create: `src/services/membershipProvider.ts`
- Test: `src/services/membershipProvider.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/services/membershipProvider.test.ts
import { describe, it, expect } from "vitest";
import { checkMembership } from "./membershipProvider";

describe("checkMembership (mock provider)", () => {
  it("always resolves isMember: false until the real Fonzip integration is wired in", async () => {
    const result = await checkMembership({
      fullName: "Test Kullanıcı",
      graduationYear: 2010,
      schoolNumber: "1234",
      phone: "+905551234567",
      email: "test@example.com",
    });
    expect(result).toEqual({ isMember: false });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/services/membershipProvider.test.ts
```

Expected: FAIL — `Cannot find module './membershipProvider'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/services/membershipProvider.ts
export interface MembershipCheckInput {
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  email: string;
}

export interface MembershipCheckResult {
  isMember: boolean;
}

// Mock until Fonzip API credentials are available — see
// docs/superpowers/specs/2026-08-29-member-onboarding-design.md. Swapping in
// the real Fonzip HTTP call means changing only this function's body; every
// caller already goes through withTimeout() and treats the result the same way.
export async function checkMembership(_input: MembershipCheckInput): Promise<MembershipCheckResult> {
  return { isMember: false };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/services/membershipProvider.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/services/membershipProvider.ts src/services/membershipProvider.test.ts
git commit -m "Add mock Fonzip membership provider behind a stable interface"
```

---

### Task 6: Supabase Admin Client

**Files:**
- Create: `src/integrations/supabase/admin.ts`

- [ ] **Step 1: Write the client**

```ts
// src/integrations/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Don't crash the build (e.g. Next.js page-data collection) when env vars are
  // absent. At runtime the env vars must be set for any admin Supabase call to work.
  console.warn(
    'Missing Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). ' +
      'Admin Supabase requests will fail until they are configured.'
  );
}

// Server-only client — import this ONLY from src/pages/api/** or other
// server-side code, never from a React component. It uses the service role
// key, which bypasses Row Level Security entirely.
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
);
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build still succeeds (this file isn't imported from anywhere yet, so it just needs to type-check standalone — `grep -c supabaseAdmin src/integrations/supabase/admin.ts` returns `1`, confirming the export exists).

- [ ] **Step 3: Commit**

```bash
git add src/integrations/supabase/admin.ts
git commit -m "Add server-only Supabase admin client"
```

---

### Task 7: Mailer (`src/lib/mailer.ts`)

**Files:**
- Modify: `package.json` (add `nodemailer`, `@types/nodemailer`)
- Create: `src/lib/mailer.ts`

- [ ] **Step 1: Install Nodemailer**

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

- [ ] **Step 2: Write the mailer**

```ts
// src/lib/mailer.ts
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
```

- [ ] **Step 3: Verify it builds**

```bash
npm run build
```

Expected: build still succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/mailer.ts
git commit -m "Add Gmail SMTP mailer for OTP codes with a dev-mode console fallback"
```

---

### Task 8: OTP Database Service (`src/services/otpService.ts`)

**Files:**
- Create: `src/services/otpService.ts`

This module is DB-facing (uses `supabaseAdmin`), so per the plan's testing approach it's verified manually against the real database rather than unit-tested with mocks — the pure logic it depends on (`otp.ts`) already has coverage from Task 3.

- [ ] **Step 1: Write the service**

```ts
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
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds. If TypeScript complains that `"otp_codes"` isn't a valid table name, Task 1 Step 4 (regenerating `database.types.ts`) wasn't applied before this — go back and confirm `grep -c otp_codes src/integrations/supabase/database.types.ts` returns a number greater than `0`.

- [ ] **Step 3: Manually verify against the real database**

Create a throwaway script (do not commit it):

```ts
// .tmp-otp-check.ts (delete after running)
import { issueOtpCode, verifyOtpCode } from "./src/services/otpService";

async function main() {
  const email = "otp-test@example.com";
  const issued = await issueOtpCode(email, "signup");
  console.log("issued:", issued);
  if ("code" in issued) {
    const wrong = await verifyOtpCode(email, "000000", "signup");
    console.log("wrong code result:", wrong);
    const right = await verifyOtpCode(email, issued.code, "signup");
    console.log("right code result:", right);
    const reused = await verifyOtpCode(email, issued.code, "signup");
    console.log("reused code result (should be invalid):", reused);
  }
}

main();
```

```bash
npx tsx .tmp-otp-check.ts
rm .tmp-otp-check.ts
```

(`npx tsx` will download `tsx` on first run if not present — that's expected.) Expected console output: `issued` has a 6-digit `code`; the wrong-code check returns `{ valid: false, error: "Kod hatalı." }`; the right-code check returns `{ valid: true }`; the reused-code check returns `{ valid: false, error: "Bu kod zaten kullanılmış..." }`.

- [ ] **Step 4: Commit**

```bash
git add src/services/otpService.ts
git commit -m "Add OTP issue/verify service backed by otp_codes"
```

---

### Task 9: API Route — Request Code

**Files:**
- Create: `src/pages/api/auth/request-code.ts`

- [ ] **Step 1: Write the route**

```ts
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
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds; `/api/auth/request-code` appears in the route list.

- [ ] **Step 3: Manually verify with curl (dev server)**

```bash
npm run dev &
sleep 3
curl -s -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"otp-test@example.com","purpose":"signup"}'
```

Expected: `{"success":true}`. If `GMAIL_APP_PASSWORD` isn't set yet, check the dev server's console output for a `[sendOtpEmail] GMAIL_APP_PASSWORD not set - would send to otp-test@example.com: "..."` line containing the code. Stop the dev server afterward (`kill %1` or close the terminal).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/request-code.ts
git commit -m "Add request-code API route for signup and password-reset OTPs"
```

---

### Task 10: API Route — Verify Code (Signup Completion)

**Files:**
- Create: `src/pages/api/auth/verify-code.ts`

This is where the account actually gets created and the membership tier assigned.

- [ ] **Step 1: Write the route**

```ts
// src/pages/api/auth/verify-code.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { verifyOtpCode } from "@/services/otpService";
import { checkMembership } from "@/services/membershipProvider";
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
  if (!verification.valid) {
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
    { isMember: false }
  );

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      graduation_year: graduationYear,
      school_number: schoolNumber,
      phone,
      membership_tier: membershipResult.isMember ? "dernek_uyesi" : "mezun_uye",
    })
    .eq("id", createdUser.user.id);

  if (profileError) {
    console.error("Profile update error after signup:", profileError);
  }

  return res.status(200).json({ success: true });
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds; `/api/auth/verify-code` appears in the route list.

- [ ] **Step 3: Manually verify end-to-end with curl (dev server)**

```bash
npm run dev &
sleep 3
curl -s -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-test@example.com","purpose":"signup"}'
```

Note the code from the dev server console (`[sendOtpEmail] ... would send to verify-test@example.com`), then:

```bash
curl -s -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-test@example.com","code":"<CODE_FROM_CONSOLE>","fullName":"Test Kullanıcı","graduationYear":2015,"schoolNumber":"1234","phone":"+905551234567","password":"test123456"}'
```

Expected: `{"success":true}`. Then confirm the profile row landed correctly (read-only check, using the connection-string pattern already used earlier in this project):

```bash
DB_PASS=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d= -f2-)
export DB_URL="postgresql://postgres:${DB_PASS}@db.nbfwziahigjweosgtajo.supabase.co:5432/postgres"
node -e "
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(\"SELECT email, full_name, graduation_year, school_number, membership_tier FROM profiles WHERE email = 'verify-test@example.com'\");
  console.log(res.rows);
  await client.end();
})();
"
```

Expected: one row with `full_name: 'Test Kullanıcı'`, `graduation_year: 2015`, `school_number: '1234'`, `membership_tier: 'mezun_uye'` (the mock provider always returns `isMember: false`). Clean up the test account afterward via the Supabase Dashboard (Authentication → Users → delete `verify-test@example.com`), since `admin.createUser` created a real auth user. Stop the dev server (`kill %1`).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/verify-code.ts
git commit -m "Add verify-code API route: creates the account and assigns membership tier"
```

---

### Task 11: API Route — Reset Password

**Files:**
- Create: `src/pages/api/auth/reset-password.ts`

- [ ] **Step 1: Write the route**

```ts
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
  if (!verification.valid) {
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
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds; `/api/auth/reset-password` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/auth/reset-password.ts
git commit -m "Add reset-password API route using the shared OTP mechanism"
```

---

### Task 12: Remove the Old Membership-Number Signup Path

**Files:**
- Modify: `src/services/authService.ts` (full rewrite)
- Delete: `src/pages/api/validate-membership.ts`

- [ ] **Step 1: Rewrite `authService.ts`**

The old `loginWithMembershipNumber` and `signupWithMembershipNumber` reference the now-dropped `membership_numbers` table and must go. `signUp`, `resetPassword`, and `confirmEmail` are also removed: they backed Supabase's own link-based email-confirmation/reset flow, which this feature deliberately replaces with the custom OTP system (Tasks 8–11). `getURL()` becomes unused once those are gone. `getCurrentUser`, `getCurrentSession`, `signIn`, `signOut`, and `onAuthStateChange` are unaffected and stay.

Replace the entire contents of `src/services/authService.ts` with:

```ts
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
      created_at: user.created_at
    } : null;
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return {
        user: null,
        error: { message: "An unexpected error occurred during sign in" }
      };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return {
        error: { message: "An unexpected error occurred during sign out" }
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
```

- [ ] **Step 2: Delete the old validation endpoint**

```bash
rm src/pages/api/validate-membership.ts
```

- [ ] **Step 3: Verify it builds**

```bash
npm run build
```

Expected: this will currently FAIL — `src/pages/auth/signup.tsx` still imports `signupWithMembershipNumber` from `authService`, which no longer exists. That's expected: Task 15 rewrites `signup.tsx` and resolves it. Confirm the *only* build error is that missing import (i.e. don't move on if there are other, unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add src/services/authService.ts
git rm src/pages/api/validate-membership.ts
git commit -m "Remove membership-number auth helpers superseded by the OTP flow"
```

(The build stays red until Task 15 — that's fine; the next task fixes the other dangling reference first.)

---

### Task 13: Clean Up the Admin Panel's Membership-Number Upload UI

**Files:**
- Modify: `src/pages/admin.tsx`
- Delete: `src/pages/admin/upload-members.tsx`

Investigation confirmed `src/pages/admin/upload-members.tsx` has zero internal links pointing to it (dead page, only reachable by typing the URL) and that `src/pages/admin.tsx`'s bulk-CSV-upload card (which referenced `membership_numbers`) is the *only* thing using its own `Upload`/`Download` icon imports and `file`/`uploading` state — nothing else in the file touches them.

- [ ] **Step 1: Delete the orphaned admin page**

```bash
rm src/pages/admin/upload-members.tsx
```

- [ ] **Step 2: Remove the dead `MembershipRecord` interface and `memberships` state from `admin.tsx`**

In `src/pages/admin.tsx`, delete:

```ts
interface MembershipRecord {
  id: string;
  membership_number: string;
  email: string;
  full_name: string;
  is_used: boolean;
  created_at: string;
}
```

and delete this line from the state declarations:

```ts
  const [memberships, setMemberships] = useState<any[]>([]);
```

and these two state declarations (only used by the bulk-upload card being removed):

```ts
  const [uploading, setUploading] = useState(false);
```

```ts
  const [file, setFile] = useState<File | null>(null);
```

- [ ] **Step 3: Remove the `loadMemberships()` call from `loadData`**

Change:

```ts
  const loadData = async () => {
    await loadUsers();
    await loadBrands();
    await loadMemberships();
    await loadNews();
    await loadProducts();
    await loadOrders();
    setLoading(false);
  };
```

to:

```ts
  const loadData = async () => {
    await loadUsers();
    await loadBrands();
    await loadNews();
    await loadProducts();
    await loadOrders();
    setLoading(false);
  };
```

- [ ] **Step 4: Delete the now-dead functions**

Delete `loadMemberships`:

```ts
  const loadMemberships = async () => {
    const { data, error } = await supabase
      .from("membership_numbers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMemberships(data);
    }
  };
```

Delete `handleFileChange`:

```ts
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
```

Delete `parseCSV`:

```ts
  const parseCSV = (text: string): Array<{ email: string; full_name: string; membership_number: string }> => {
    const lines = text.split("\n").filter(line => line.trim());
    const records: Array<{ email: string; full_name: string; membership_number: string }> = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.includes(";") 
        ? line.split(";").map(p => p.trim()) 
        : line.split(",").map(p => p.trim());

      if (parts.length >= 3) {
        const [email, full_name, membership_number] = parts;
        
        if (membership_number && /^\d{8}$/.test(membership_number.trim())) {
          records.push({
            email: email.trim(),
            full_name: full_name.trim(),
            membership_number: membership_number.trim(),
          });
        }
      }
    }

    return records;
  };
```

Delete `handleUpload`:

```ts
  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Hata", description: "Lütfen bir dosya seçin", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        toast({
          title: "Hata",
          description: "Dosyada geçerli kayıt bulunamadı. Format: Email, Ad Soyad, Üyelik No (8 haneli)",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("membership_numbers").insert(records);

      if (error) {
        toast({ title: "Hata", description: `Kayıtlar eklenirken hata: ${error.message}`, variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: `${records.length} kayıt başarıyla eklendi` });
        setFile(null);
        loadMemberships();
      }
    } catch (error: any) {
      toast({ title: "Hata", description: `Dosya işlenirken hata: ${error.message}`, variant: "destructive" });
    }

    setUploading(false);
  };
```

Delete `handleDelete`:

```ts
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("membership_numbers").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Kayıt silinemedi", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Kayıt silindi" });
      loadMemberships();
    }
  };
```

Delete `downloadTemplate`:

```ts
  const downloadTemplate = () => {
    const csvContent = "Email,Full Name,Membership Number\nahmet@example.com,Ahmet Yılmaz,12345678\nayse@example.com,Ayşe Demir,87654321";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "membership_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };
```

- [ ] **Step 5: Remove the "Toplu Üyelik Numarası Yükleme" card from the JSX**

Delete this entire block (it sits directly above the `<Tabs defaultValue="users" ...>` element):

```tsx
            {/* Toplu Yükleme Bölümü (Her zaman üstte görünsün) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Toplu Üyelik Numarası Yükleme
                </CardTitle>
                <CardDescription>CSV veya Excel dosyasından üyelik numaralarını toplu yükleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Dosya Formatı:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>CSV formatı (virgül veya noktalı virgül ile ayrılmış)</li>
                    <li>İlk satır başlık: Email, Full Name, Membership Number</li>
                    <li>Örnek: ahmet@example.com,Ahmet Yılmaz,12345678</li>
                  </ul>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2">
                    <Download className="h-4 w-4 mr-2" /> Örnek Dosya İndir
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV/Excel Dosyası</Label>
                  <Input id="csv-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                  {file && <p className="text-sm text-muted-foreground">Seçilen dosya: {file.name}</p>}
                </div>

                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</> : <><Upload className="mr-2 h-4 w-4" /> Dosyayı Yükle</>}
                </Button>
              </CardContent>
            </Card>

```

(Leave the `{/* SEKMELER */}` comment and `<Tabs defaultValue="users" ...>` line immediately after it in place.)

- [ ] **Step 6: Replace the "Üyelik No" column with membership tier**

In the "users" `TabsContent`, change the header:

```tsx
                          <TableHead>Üyelik No</TableHead>
```

to:

```tsx
                          <TableHead>Durum</TableHead>
```

and change the cell:

```tsx
                            <TableCell>{u.membership_number || '-'}</TableCell>
```

to:

```tsx
                            <TableCell>{u.membership_tier === 'dernek_uyesi' ? 'Dernek Üyesi' : 'Mezun Üye'}</TableCell>
```

- [ ] **Step 7: Remove the now-unused `Upload`/`Download` icon imports**

Change:

```ts
  Shield,
  Tag,
  Upload
} from "lucide-react";
```

to:

```ts
  Shield,
  Tag
} from "lucide-react";
```

and remove `Download,` from the same import block (it appears earlier in the list, e.g. `Download,` on its own line — delete that line).

- [ ] **Step 8: Verify it builds and lints clean**

```bash
npm run build
npm run lint
```

Expected: both succeed with no errors (the missing-import error from Task 12 is unrelated to this file and is resolved in Task 15).

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin.tsx
git rm src/pages/admin/upload-members.tsx
git commit -m "Remove dead membership-number bulk-upload admin UI"
```

---

### Task 14: Welcome Page

**Files:**
- Create: `src/pages/welcome.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/pages/welcome.tsx
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WelcomePage() {
  return (
    <>
      <SEO title="Hoş Geldiniz - Eyüboğlu Mezunlar Derneği" description="Mezunlar ağına katılın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader className="space-y-3">
            <img
              src="/logo.jpg"
              alt="Eyüboğlu Mezunlar Derneği logosu"
              className="h-16 w-auto mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <CardTitle className="text-3xl font-heading font-bold">Eyüboğlu Mezunlar Derneği</CardTitle>
            <CardDescription>Mezunlar ağına hoş geldiniz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">Giriş Yap</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/auth/signup">Kayıt Ol</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/auth/forgot-password">Şifremi Unuttum</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: `/welcome` appears in the route list. (The build is still red overall from Task 12 until Task 15 — check that no *new* errors appeared beyond the known missing import.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/welcome.tsx
git commit -m "Add the welcome/landing page"
```

---

### Task 15: Rewrite Signup Page

**Files:**
- Modify: `src/pages/auth/signup.tsx` (full rewrite)

This resolves the build break from Task 12 (the missing `signupWithMembershipNumber` import).

- [ ] **Step 1: Replace the entire contents of `src/pages/auth/signup.tsx`**

```tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!fullName || !graduationYear || !schoolNumber || !phone || !email || !password) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        "pendingSignup",
        JSON.stringify({
          fullName,
          graduationYear: Number(graduationYear),
          schoolNumber,
          phone,
          email,
          password,
        })
      );

      toast({ title: "Kod gönderildi", description: "E-postanıza gelen 6 haneli kodu girin" });
      router.push("/auth/verify-code");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Kayıt Ol - Mezunlar Derneği" description="Mezunlar ağına katılın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Kayıt Ol</CardTitle>
            <CardDescription className="text-center">
              Mezunlar ağına katılın ve bağlantılar kurun
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullname">Ad Soyad</Label>
                <Input id="fullname" type="text" placeholder="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation-year">Mezuniyet Yılı</Label>
                <Input id="graduation-year" type="number" placeholder="2015" min={1950} max={2100} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-number">Okul Numarası</Label>
                <Input id="school-number" type="text" placeholder="Okul numaranız" value={schoolNumber} onChange={(e) => setSchoolNumber(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" placeholder="+90 555 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">E-posta Adresi</Label>
                <Input id="signup-email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Şifre</Label>
                <Input id="signup-password" type="password" placeholder="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                <Input id="confirm-password" type="password" placeholder="Şifrenizi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kod Gönder
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-center text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Giriş Yapın
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the build is green again**

```bash
npm run build
```

Expected: succeeds with no errors (this was the last thing blocking the build since Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/signup.tsx
git commit -m "Rewrite signup page for open registration with OTP verification"
```

---

### Task 16: Verify-Code Page

**Files:**
- Create: `src/pages/auth/verify-code.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PendingSignup {
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  email: string;
  password: string;
}

export default function VerifyCodePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingSignup");
    if (!stored) {
      toast({ title: "Kayıt bilgisi bulunamadı", description: "Lütfen önce kayıt formunu doldurun", variant: "destructive" });
      router.replace("/auth/signup");
      return;
    }
    setPending(JSON.parse(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Doğrulama başarısız", description: data.error || "Kod hatalı", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pending.email,
        password: pending.password,
      });

      sessionStorage.removeItem("pendingSignup");

      if (signInError) {
        toast({ title: "Hesap oluşturuldu", description: "Lütfen giriş yapın" });
        router.push("/auth/login");
        return;
      }

      toast({ title: "Kayıt tamamlandı! 🎉", description: "Hoş geldiniz" });
      router.push("/");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pending || resending) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
      } else {
        toast({ title: "Kod yeniden gönderildi" });
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (!pending) return null;

  return (
    <>
      <SEO title="Kodu Doğrula - Mezunlar Derneği" description="E-postanıza gelen kodu girin" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Kodu Doğrula</CardTitle>
            <CardDescription className="text-center">
              {pending.email} adresine gönderilen 6 haneli kodu girin
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Doğrulama Kodu</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Doğrula
              </Button>
            </form>

            <Button variant="ghost" className="w-full" onClick={handleResend} disabled={resending}>
              {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kodu Tekrar Gönder
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
npm run lint
```

Expected: both succeed; `/auth/verify-code` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/verify-code.tsx
git commit -m "Add signup code-verification page"
```

---

### Task 17: Forgot-Password Page

**Files:**
- Create: `src/pages/auth/forgot-password.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.setItem("pendingReset", JSON.stringify({ email }));
      toast({ title: "Kod gönderildi", description: "E-postanıza gelen 6 haneli kodu girin" });
      router.push("/auth/reset-password");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Şifremi Unuttum - Mezunlar Derneği" description="Şifrenizi sıfırlayın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Şifremi Unuttum</CardTitle>
            <CardDescription className="text-center">
              E-posta adresinize bir doğrulama kodu göndereceğiz
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-posta</Label>
                <Input id="forgot-email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kod Gönder
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-center text-muted-foreground">
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Giriş sayfasına dön
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: succeeds; `/auth/forgot-password` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/forgot-password.tsx
git commit -m "Add forgot-password page"
```

---

### Task 18: Reset-Password Page

**Files:**
- Create: `src/pages/auth/reset-password.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingReset {
  email: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingReset");
    if (!stored) {
      toast({ title: "İstek bulunamadı", description: "Lütfen önce şifremi unuttum formunu doldurun", variant: "destructive" });
      router.replace("/auth/forgot-password");
      return;
    }
    setPending(JSON.parse(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || loading) return;

    if (newPassword.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, code, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Şifre güncellenemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("pendingReset");
      toast({ title: "Şifre güncellendi", description: "Yeni şifrenizle giriş yapabilirsiniz" });
      router.push("/auth/login");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!pending) return null;

  return (
    <>
      <SEO title="Şifre Sıfırla - Mezunlar Derneği" description="Yeni şifrenizi belirleyin" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Şifre Sıfırla</CardTitle>
            <CardDescription className="text-center">
              {pending.email} adresine gönderilen kodu ve yeni şifrenizi girin
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-code">Doğrulama Kodu</Label>
                <Input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input id="new-password" type="password" placeholder="En az 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Yeni Şifre Tekrar</Label>
                <Input id="confirm-new-password" type="password" placeholder="Şifrenizi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: succeeds; `/auth/reset-password` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/reset-password.tsx
git commit -m "Add reset-password page"
```

---

### Task 19: Update Login Page

**Files:**
- Modify: `src/pages/auth/login.tsx`

The current page has no way to reach "forgot password" at all. Add that link and a way back to `/welcome`.

- [ ] **Step 1: Add a "Şifremi unuttum?" link under the password field**

Change:

```tsx
              <div className="space-y-2">
                <Label htmlFor="login-password">Şifre</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
```

to:

```tsx
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Şifre</Label>
                  <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                    Şifremi unuttum?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: succeeds (no new imports needed — `Link` is already imported in this file).

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/login.tsx
git commit -m "Add forgot-password link to the login page"
```

---

### Task 20: Route Guard in `_app.tsx`

**Files:**
- Modify: `src/pages/_app.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { WhatsAppFloating } from "@/components/WhatsAppFloating";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/globals.css";

function isPublicPath(pathname: string): boolean {
  return pathname === "/welcome" || pathname.startsWith("/auth/");
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isPublicPath(router.pathname)) {
        router.replace("/welcome");
        return;
      }
      if (active) setChecked(true);
    };

    checkAccess();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublicPath(router.pathname)) {
        router.replace("/welcome");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  if (!checked && !isPublicPath(router.pathname)) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex flex-col min-h-screen">
          <Component {...pageProps} />
          <Footer />
        </div>
        <Toaster />
        <WhatsAppFloating />
      </LanguageProvider>
    </ThemeProvider>
  );
}
```

Note: this is a client-side redirect for UX only — it is not a security boundary. The real boundary remains Supabase's Row Level Security policies on each table, which are unaffected by this change.

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Manual browser check**

```bash
npm run dev
```

In a private/incognito browser window (no existing session), navigate to `http://localhost:3000/events`. Expected: immediately redirected to `http://localhost:3000/welcome`. Then navigate to `http://localhost:3000/welcome` directly — expected: loads normally, no redirect loop.

- [ ] **Step 4: Commit**

```bash
git add src/pages/_app.tsx
git commit -m "Add site-wide auth gate redirecting logged-out visitors to /welcome"
```

---

### Task 21: Fix Navigation (Root Cause of the Original Bug)

**Files:**
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Remove the early return**

Delete these lines (currently right after the `handleMarkAllRead` function, before `const aboutItems = ...`):

```tsx
  if (!user) {
    return null;
  }

```

Now that `_app.tsx` (Task 20) redirects every logged-out visitor to `/welcome` before any page with `<Navigation />` can render, this check is redundant — and it was the actual root cause of the "menu invisible" bug reported at the start of this conversation (it wasn't a responsive-design issue; logged-out sessions rendered nothing at all, on any screen size).

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Manual browser check**

With a logged-in session, open the app at a desktop-width window. Expected: the full navigation bar (Ana Sayfa, Hakkımızda, Mezun Store, Üyeler, etc.) is visible, matching what was already visible on mobile via the hamburger menu.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navigation.tsx
git commit -m "Remove redundant logged-out early return in Navigation (root-cause fix)"
```

---

### Task 22: Text Consistency — "Başarı Hikayeleri"

**Files:**
- Modify: `src/pages/index.tsx`
- Modify: `src/pages/testimonials.tsx`

- [ ] **Step 1: Update the homepage menu grid**

In `src/pages/index.tsx`, change:

```tsx
    {
      title: "Başarılı Mezunlar",
      description: "İlham verici hikayeler",
      icon: Star,
      href: "/testimonials",
      gradient: "from-yellow-500 to-yellow-600",
      iconBg: "bg-yellow-100 text-yellow-600",
    },
```

to:

```tsx
    {
      title: "Başarı Hikayeleri",
      description: "İlham verici hikayeler",
      icon: Star,
      href: "/testimonials",
      gradient: "from-yellow-500 to-yellow-600",
      iconBg: "bg-yellow-100 text-yellow-600",
    },
```

- [ ] **Step 2: Update the testimonials page itself**

In `src/pages/testimonials.tsx`, change:

```tsx
        <SEO title="Başarılı Mezunlarımız" description="Eyüboğlu mezunlarının başarı hikayeleri" />
```

to:

```tsx
        <SEO title="Başarı Hikayeleri" description="Eyüboğlu mezunlarının başarı hikayeleri" />
```

and change:

```tsx
                Başarılı Mezunlarımızın Görüşleri
```

to:

```tsx
                Başarı Hikayeleri
```

- [ ] **Step 3: Verify it builds**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.tsx src/pages/testimonials.tsx
git commit -m "Standardize on Başarı Hikayeleri wording across nav, homepage, and page title"
```

---

### Task 23: Final Verification Pass

**Files:** none (verification only)

- [ ] **Step 1: Full build, lint, and unit tests**

```bash
npm run build
npm run lint
npm test
```

Expected: all three succeed with no errors.

- [ ] **Step 2: Manual end-to-end browser walkthrough**

```bash
npm run dev
```

In a private/incognito window:
1. Go to `http://localhost:3000/` → redirected to `/welcome`.
2. Click "Kayıt Ol" → fill the form with a real-but-disposable email you can check → submit → redirected to `/auth/verify-code`.
3. Check the dev server console (or your inbox, if `GMAIL_APP_PASSWORD` is set) for the code, enter it → submit.
4. Expected: redirected to `/` (homepage), full navigation menu visible, logged in.
5. Log out via the user menu → confirm redirected/landing back at `/welcome` (or at least that re-visiting any page bounces to `/welcome`).
6. Go to `/auth/login`, click "Şifremi unuttum?" → enter the same email → submit → redirected to `/auth/reset-password`.
7. Enter the code + a new password → submit → redirected to `/auth/login` → log in with the new password → succeeds.
8. Confirm the homepage's "Başarı Hikayeleri" card and the `/testimonials` page title read the same.
9. Delete the disposable test account afterward via the Supabase Dashboard (Authentication → Users).

- [ ] **Step 3: Push**

Only after the user confirms the manual walkthrough looks right:

```bash
git push origin main
```

---

## Explicitly Deferred (per spec)

- Which specific features are restricted for `mezun_uye` vs available to `dernek_uyesi` — a separate future task once the user decides.
- The real Fonzip API call inside `src/services/membershipProvider.ts` — swap in once credentials/docs are provided; no other file needs to change when that happens.
