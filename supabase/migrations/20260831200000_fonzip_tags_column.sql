-- Adds fonzip_tags to hold the raw Fonzip tags found for a member (e.g.
-- "Dernek Üyesi, Yönetim"). Fonzip's unpaid_debt_count turned out to be an
-- unreliable signal for tier assignment (see project memory); the
-- association tags members directly ("Dernek Üyesi", "Mezun Üye",
-- "Bağışçı", "Fahri Üye", "Yönetim") and that's the field membership_tier
-- should actually be derived from. fonzip_debt_status is no longer written
-- (app code stopped reading/writing it) but is left in place rather than
-- dropped - it holds no real data (always null, since it was broken from
-- day one - see project memory) and dropping a column needs a deliberate
-- separate cleanup, not bundled into a feature change.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fonzip_tags TEXT;
