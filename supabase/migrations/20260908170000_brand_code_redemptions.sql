-- Count repeated use of a shared brand code.
--
-- 20260908160000 kept one row per (campaign, member) in `brand_code_usages`
-- with a single `redeemed_at`, so a member who used the same café code every
-- week still counted once: the counters answered "how many members", never
-- "how many times". This adds an append-only ledger where each use is its own
-- row, and the counters are computed from it.
--
-- `brand_code_usages` keeps its (campaign, member) uniqueness and stays the
-- member's state for a campaign: whether they revealed it, which personal code
-- they hold, when it expires. Its `redeemed_at`/`redeemed_by`/`redeem_note`
-- now describe the MOST RECENT use (and, for single-use campaigns, still mark
-- that the member's personal code is spent).

CREATE TABLE IF NOT EXISTS brand_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_code_id UUID NOT NULL REFERENCES brand_discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- The member's state row for this campaign; kept nullable so a redemption
  -- survives even if that row is ever cleaned up.
  usage_id UUID REFERENCES brand_code_usages(id) ON DELETE SET NULL,
  -- Snapshot of the exact code presented, so the ledger still reads correctly
  -- after the campaign code is renamed.
  code_used TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  redeemed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_code_redemptions_code
  ON brand_code_redemptions (brand_code_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_code_redemptions_user
  ON brand_code_redemptions (user_id, brand_code_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_code_redemptions_usage
  ON brand_code_redemptions (usage_id);

-- Same posture as brand_code_usages: members read their own rows, staff read
-- everything, and every write goes through /api/admin/brand-codes/redeem with
-- the service role — there is no member INSERT/UPDATE policy on purpose.
ALTER TABLE brand_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_redemptions" ON brand_code_redemptions;
CREATE POLICY "users_read_own_redemptions" ON brand_code_redemptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_manage_redemptions" ON brand_code_redemptions;
CREATE POLICY "staff_manage_redemptions" ON brand_code_redemptions
  FOR ALL USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Carry over redemptions already recorded on the usage rows so the counters
-- don't reset. Idempotent: re-running skips rows already in the ledger.
INSERT INTO brand_code_redemptions (brand_code_id, user_id, usage_id, code_used, redeemed_at, redeemed_by, note)
SELECT u.brand_code_id, u.user_id, u.id, COALESCE(u.member_code, c.code), u.redeemed_at, u.redeemed_by, u.redeem_note
FROM brand_code_usages u
JOIN brand_discount_codes c ON c.id = u.brand_code_id
WHERE u.redeemed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM brand_code_redemptions r WHERE r.usage_id = u.id
  );
