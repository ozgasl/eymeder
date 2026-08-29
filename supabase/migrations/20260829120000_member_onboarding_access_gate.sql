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
