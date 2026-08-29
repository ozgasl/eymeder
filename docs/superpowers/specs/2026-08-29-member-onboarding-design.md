# Member Onboarding & Access Gate — Design Spec

Date: 2026-08-29
Status: Approved by user, ready for implementation planning

## Background

The app currently has no true entry gate. `Navigation.tsx` returns `null` when
there is no logged-in user, which is what produced the originally reported bug
("menu shows on mobile, not on desktop" — actually caused by different login
state per device, not a responsive-design bug). Signup currently requires a
pre-existing 8-digit `membership_numbers` row (email + number match) — a flow
designed for an Excel-imported roster that never went into production (the
table holds 1 unused test row; `profiles` holds 3 test rows; no real member
data exists yet).

The user supplied an Excel export (`Uyeler_eymeder_guncellenmis.xlsx`, sheet
`eymeder`, 155 rows) intended as the association roster. Its columns are:
`Mezun Olduğum Yıl, Mezun Olduğum Okul, Mesleğim, Doğum Yeri, Baba Adı, Anne Adı,
Üye No, Doğum Tarihi, Uyruk, TC Kimlik No, Telefon, Soyad, Ad`. Notably: **no
email column**, and no "okul numarası" (school student number) column — only
"Üye No" (association membership number). Mid-conversation the user redirected:
membership matching should not use this static file at all — the association's
Fonzip platform (already linked from the nav for dues/donations/signup) holds
the live, authoritative member list and exposes an API. Fonzip API credentials
will be provided later; this spec designs around a pluggable interface so that
detail can slot in without reshaping anything else.

## Goal

Replace the current ad-hoc, membership-number-gated signup with:
1. A public welcome page that is the mandatory entry point for the whole app.
2. Open registration (anyone can create an account) collecting: Ad Soyad,
   Mezuniyet Yılı, Okul Numarası, Telefon, E-posta, Şifre.
3. Email verification via a 6-digit code sent from `eymeder@gmail.com`.
4. Automatic role assignment based on a live Fonzip membership check:
   matched → `dernek_uyesi` (full access), not matched → `mezun_uye`
   (restricted access — which specific features are restricted is an
   explicit **out-of-scope / later-phase** decision).
5. The existing homepage becomes the post-login landing page, and once there,
   the full navigation menu is visible to every logged-in user regardless of
   tier (tier only gates individual features later, not menu visibility).

## End-to-end Flow

1. Unauthenticated visitor hits any route → redirected to `/welcome`.
2. `/welcome` offers: Giriş Yap / Kayıt Ol / Şifremi Unuttum.
3. **Kayıt Ol** (`/auth/signup`, rewritten): Ad Soyad, Mezuniyet Yılı, Okul
   Numarası, Telefon, E-posta, Şifre — all fields required.
4. Server generates a 6-digit code, stores it hashed with an expiry, emails it
   to the supplied address from `eymeder@gmail.com` via Gmail SMTP.
5. User enters the code on `/auth/verify-code`. On success:
   - Supabase Auth user + `profiles` row created.
   - Fonzip membership check runs (name + graduation year + school number,
     exact query params to be finalized once the API is available).
   - `profiles.membership_tier` set to `dernek_uyesi` or `mezun_uye`
     accordingly (default `mezun_uye` on any lookup failure/timeout — see
     Error Handling).
   - User is signed in and redirected to `/` (existing homepage).
6. **Giriş Yap** (`/auth/login`): unchanged — Supabase email/password sign-in.
7. **Şifremi Unuttum** (`/auth/forgot-password`, new) → same 6-digit-code
   mechanism → `/auth/reset-password` (new) to enter code + new password.

## Data Model Changes

- `profiles`: add `school_number TEXT`, `membership_tier TEXT NOT NULL DEFAULT
  'mezun_uye' CHECK (membership_tier IN ('dernek_uyesi', 'mezun_uye'))`.
  (`graduation_year`, `phone` already exist.)
- New table `otp_codes`: `email TEXT, code_hash TEXT, purpose TEXT CHECK
  (purpose IN ('signup', 'password_reset')), expires_at TIMESTAMPTZ, attempts
  INT DEFAULT 0, consumed BOOLEAN DEFAULT false, created_at TIMESTAMPTZ
  DEFAULT now()`. Powers both signup verification and password reset — one
  mechanism, two purposes.
- Remove the membership-number signup path: drop the `membership_numbers`
  table and the `profiles.membership_number` column/FK, and delete
  `src/pages/api/validate-membership.ts` and the `loginWithMembershipNumber` /
  `signupWithMembershipNumber` helpers in `authService.ts`. Safe — no real
  data depends on this (verified: 1 unused test row).
- `roles` table (admin/moderator/member) is untouched — it is a separate
  authorization concern (admin panel access) orthogonal to
  `membership_tier`.

## Fonzip Integration

- Defined behind a `membershipProvider` interface:
  `checkMembership({ fullName, graduationYear, schoolNumber, phone, email }) =>
  Promise<{ isMember: boolean }>`.
- Until real credentials arrive: a mock implementation that always returns
  `{ isMember: false }`, so the rest of the flow is buildable/testable now.
- Swapping in the real Fonzip implementation later should require touching
  only the provider module, not the signup/verification flow.
- Call happens server-side, at code-verification time, with a 5–8s timeout.
  On timeout or error: default to `mezun_uye`, log the failure for later
  manual review/upgrade — never block or fail the signup because of it.

## Email / OTP System

- Server-side helper `sendOtpEmail(email, code, purpose)` using Nodemailer
  over Gmail SMTP (`smtp.gmail.com:587`), authenticated as `eymeder@gmail.com`
  via an **App Password** (Gmail requires this for SMTP; the user will
  generate it in the `eymeder@gmail.com` Google Account and supply it as the
  `GMAIL_APP_PASSWORD` env var directly in `.env.local` / Vercel — not shared
  with the assistant).
- Code: 6 digits, 10-minute expiry, stored hashed (never plaintext) in
  `otp_codes`. 5 failed attempts invalidates the code and requires a resend.
- Rate limit: max 1 code request per email per 60 seconds, to curb abuse.
- Same mechanism serves both signup verification and password reset
  (`purpose` column distinguishes them) — one implementation to maintain.
- Gmail's personal-account sending cap (~500/day) comfortably covers the
  current roster size (155) plus new signups; if that ever becomes a
  constraint, swapping the mail transport is a one-module change.

## Pages

- `/welcome` (new): landing page with Giriş Yap / Kayıt Ol / Şifremi Unuttum.
- `/auth/login`: unchanged logic, restyled to match `/welcome`.
- `/auth/signup`: rewritten — Ad Soyad / Mezuniyet Yılı / Okul Numarası /
  Telefon / E-posta / Şifre, no membership-number field.
- `/auth/verify-code` (new): 6-digit code entry after signup.
- `/auth/forgot-password` (new): email entry to request a reset code.
- `/auth/reset-password` (new): code + new password entry. (This route was
  already referenced by `authService.resetPassword`'s redirect but the page
  never existed.)

## Route Guard (site-wide access gate)

- Central check added in `_app.tsx`: on each navigation, check the Supabase
  session; if absent and the target route is not `/welcome` or under
  `/auth/*`, redirect to `/welcome`.
- `Navigation.tsx`'s `if (!user) return null;` is removed — by construction,
  anything rendering `Navigation` is already behind the gate, so the check is
  redundant. This is also the root-cause fix for the originally reported
  "menu invisible" bug: it was never a responsive-design issue, it was that
  logged-out sessions rendered nothing at all.

## Text Consistency Fix

Both the homepage menu grid (`src/pages/index.tsx`, currently "Başarılı
Mezunlar") and the testimonials page itself (`src/pages/testimonials.tsx`,
SEO title "Başarılı Mezunlarımız" and heading "Başarılı Mezunlarımızın
Görüşleri") will be changed to use **"Başarı Hikayeleri"** wording, matching
what `Navigation.tsx` already uses. (Reverses the direction floated earlier in
conversation — the nav copy is being kept, the page/homepage copy changes to
match it.)

## Error Handling

- Invalid/missing form fields: existing toast pattern.
- Duplicate email at signup: Supabase Auth's own conflict surfaced with a
  clear message ("bu e-posta ile zaten bir hesap var").
- Wrong/expired code: "kod hatalı veya süresi dolmuş" + resend option.
- SMTP send failure: surfaced to the user as "e-posta gönderilemedi, tekrar
  deneyin" — no auth user is created until the code is verified, so a failed
  send never leaves a half-created account behind.
- Fonzip timeout/error: silently defaults to `mezun_uye`, logs the failure
  (see Fonzip Integration above).
- OTP request flooding: 1-per-minute-per-email throttle.

## Testing Plan

- Re-run `npm run build` / `npm run lint` after implementation.
- Manual end-to-end browser pass: signup → code entry → lands on `/` with
  full nav visible → correct tier assigned (against the mock provider, since
  real Fonzip credentials aren't available yet).
- Confirm an unauthenticated direct hit on an arbitrary route (e.g.
  `/events`) redirects to `/welcome`.
- Manual pass of the forgot-password flow end to end.
- Real Gmail SMTP send needs the user to supply `GMAIL_APP_PASSWORD`; until
  then, sends are verified via logs/mocked transport.

## Explicitly Out of Scope (later phase)

- Which specific features/pages are restricted for `mezun_uye` vs granted to
  `dernek_uyesi` — the user will decide this separately.
- The real Fonzip API request/response shape — plugged in once credentials
  and docs are provided.
