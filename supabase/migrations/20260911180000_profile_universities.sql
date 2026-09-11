-- Multiple universities per profile.
--
-- `profiles.university` / `university_status` / `university_graduation_year`
-- only ever held one. This adds a child table for the general case; the
-- single columns stay on `profiles` for now (see the backfill migration
-- right after this one) and are dropped in a later session once every
-- consumer has moved over and the backfill is confirmed in production.
--
-- Read access mirrors the split that already exists on `profiles` /
-- `member_profiles`: the university NAME is the kind of detail any
-- signed-in member can see about another (same tier as `profiles.university`
-- itself, which member_profiles exposes unmasked), but STATUS and
-- GRADUATION YEAR are masked the same way `university_status` /
-- `university_graduation_year` already are on `member_profiles` — visible
-- only to the row's owner, a dues-paying member, or staff. RLS is row-level
-- and cannot express that split by itself, so the base table gets the same
-- narrowed policy as `profiles`, and a `member_profile_universities` view
-- (mirroring `member_profiles`) does the column-level masking for anyone
-- reading someone else's rows.
CREATE TABLE IF NOT EXISTS profile_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  status TEXT CHECK (status IN ('studying', 'graduated')),
  graduation_year INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_universities_profile_id ON profile_universities(profile_id);

ALTER TABLE profile_universities ENABLE ROW LEVEL SECURITY;

-- Same shape as profiles' own "authenticated_read_profiles": your own rows,
-- always, or another member's rows if you carry the Fonzip "Dernek Üyesi"
-- tag or are staff. Anyone else reads through member_profile_universities.
DROP POLICY IF EXISTS "read_own_or_privileged_profile_universities" ON profile_universities;
CREATE POLICY "read_own_or_privileged_profile_universities" ON profile_universities
  FOR SELECT TO authenticated
  USING (
    auth.uid() = profile_id
    OR public.is_dernek_uyesi(auth.uid())
    OR public.is_staff(auth.uid())
  );

-- Only the client writes here (profileService.replaceMyUniversities), always
-- for the signed-in member's own rows — same as profiles.users_update_own_profile.
-- No staff policy: as with `profiles`, staff changes go through service-role
-- admin routes, which bypass RLS entirely.
DROP POLICY IF EXISTS "insert_own_profile_universities" ON profile_universities;
CREATE POLICY "insert_own_profile_universities" ON profile_universities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "update_own_profile_universities" ON profile_universities;
CREATE POLICY "update_own_profile_universities" ON profile_universities
  FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "delete_own_profile_universities" ON profile_universities;
CREATE POLICY "delete_own_profile_universities" ON profile_universities
  FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- The "someone else's rows" read path. Same WHERE auth.uid() IS NOT NULL +
-- grant-to-anon-and-authenticated pattern as member_profiles, for the same
-- reason: a logged-out visitor must get an empty result, not a permission
-- error that would take down whatever page embeds this.
CREATE OR REPLACE VIEW public.member_profile_universities AS
SELECT
  pu.id,
  pu.profile_id,
  pu.university,
  pu.sort_order,
  pu.created_at,
  CASE WHEN public.member_sees_full_profile(pu.profile_id) THEN pu.status END          AS status,
  CASE WHEN public.member_sees_full_profile(pu.profile_id) THEN pu.graduation_year END AS graduation_year
FROM public.profile_universities pu
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profile_universities SET (security_invoker = false);

GRANT SELECT ON public.member_profile_universities TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
