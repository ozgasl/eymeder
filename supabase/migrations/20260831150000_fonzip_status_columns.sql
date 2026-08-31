-- Separates the two facts Fonzip's membership_no + unpaid_debt_count lookup
-- previously collapsed into a single "isMember" boolean, so the admin panel
-- can show WHY a member ended up mezun_uye instead of dernek_uyesi (no
-- matching Fonzip membership at all, vs. a matching membership with unpaid
-- dues) instead of just the final tier.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fonzip_membership_status TEXT
    CHECK (fonzip_membership_status IN ('var', 'yok')),
  ADD COLUMN IF NOT EXISTS fonzip_debt_status TEXT
    CHECK (fonzip_debt_status IN ('var', 'yok')),
  ADD COLUMN IF NOT EXISTS fonzip_checked_at TIMESTAMPTZ;
