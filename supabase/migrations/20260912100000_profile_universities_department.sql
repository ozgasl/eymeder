-- Add a "Bölüm" (department/faculty) field to profile_universities, split
-- out from the free-text university name (until now some members typed
-- "İTÜ Makine Mühendisliği" or similar into the university field itself —
-- see the standardization backfill in the next migration).
--
-- Manual-only by design (no fixed list): the university has one, mostly
-- stable, YÖK-recognized name; a department name varies far more (own
-- wording, joint/double-major programs, faculty vs. department phrasing) and
-- isn't worth forcing into a picklist.

ALTER TABLE profile_universities ADD COLUMN IF NOT EXISTS department TEXT;

-- member_profile_universities masks status/graduation_year the same way
-- member_profiles masks the analogous profession/company/etc columns —
-- department is exactly that kind of specific, personal detail, so it gets
-- the same treatment. New column MUST be appended at the very end of the
-- SELECT list: CREATE OR REPLACE VIEW only allows adding columns there,
-- inserting one earlier renames whatever was last instead (42P16 — hit this
-- exact mistake once already on member_profiles, see
-- 20260911170000_profession_group.sql's comment).
CREATE OR REPLACE VIEW public.member_profile_universities AS
SELECT
  pu.id,
  pu.profile_id,
  pu.university,
  pu.sort_order,
  pu.created_at,
  CASE WHEN public.member_sees_full_profile(pu.profile_id) THEN pu.status END          AS status,
  CASE WHEN public.member_sees_full_profile(pu.profile_id) THEN pu.graduation_year END AS graduation_year,
  CASE WHEN public.member_sees_full_profile(pu.profile_id) THEN pu.department END      AS department
FROM public.profile_universities pu
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profile_universities SET (security_invoker = false);

GRANT SELECT ON public.member_profile_universities TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
