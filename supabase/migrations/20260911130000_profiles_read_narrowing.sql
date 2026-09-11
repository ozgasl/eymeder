-- Column-level visibility, enforced (stage 2, step 2 of 2).
--
-- Step 1 added `member_profiles` and moved one service onto it to answer the
-- question the design hung on: can PostgREST embed a view through the foreign
-- key of its base table? It can — the gallery card shows the uploader's name
-- through `member_profiles!media_gallery_user_id_fkey`. So the remaining
-- services are moved over in the same commit as this migration, and the
-- `profiles` SELECT policy can finally be narrowed to match the view.
--
-- Until this runs, the masking is a courtesy: `member_profiles` hides the
-- columns, but any signed-in member could still read `profiles` directly from
-- the browser and get every other member's e-mail, phone, city and Fonzip
-- state. That is the hole this closes.

-- ---------------------------------------------------------------------------
-- 1. The view has to answer a logged-out visitor, not refuse them.
-- ---------------------------------------------------------------------------
--
-- Step 1 granted SELECT to `authenticated` only. That is fine while nothing
-- public reads the view, but the news, events, jobs, groups and gallery pages
-- are all reachable without a session, and they are about to embed it. A
-- missing GRANT is not an empty result — PostgREST fails the whole request
-- with "permission denied for view member_profiles", which would take the
-- page's own rows down with it, not just the author's name.
--
-- Granting `anon` and filtering the rows instead reproduces exactly what those
-- pages do today: since 20260911100000 there is no SELECT policy for `anon` on
-- `profiles`, so a logged-out visitor already gets zero profile rows and the
-- embed already resolves to null. `WHERE auth.uid() IS NOT NULL` keeps that
-- true through the view. An empty set is the honest answer here; a grant
-- without the filter would be a real regression, because the view is
-- security_invoker = false and would hand every member's name to the public.

CREATE OR REPLACE VIEW public.member_profiles AS
SELECT
  -- Always visible: this is what a non-dernek-üyesi member may see of another.
  p.id,
  p.full_name,
  p.university,
  p.graduation_year,
  -- Not personal data, and the mentorship list filters on it.
  p.is_mentor,
  -- Ordering key used by the directory and the admin panel.
  p.created_at,

  -- Everything else is visible only to the member themselves, to a dues-paying
  -- member, or to staff. is_dernek_uyesi/is_staff are SECURITY DEFINER, so a
  -- view over profiles asking them cannot recurse back into profiles RLS.
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.avatar_url END                 AS avatar_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.email END                      AS email,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.phone END                      AS phone,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.bio END                        AS bio,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.city END                       AS city,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.country END                    AS country,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.company END                    AS company,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.profession END                 AS profession,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.department END                 AS department,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.university_status END          AS university_status,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.university_graduation_year END AS university_graduation_year,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.high_school_graduation_year END AS high_school_graduation_year,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.linkedin_url END               AS linkedin_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.twitter_url END                AS twitter_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.instagram_url END              AS instagram_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.facebook_url END               AS facebook_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.mentor_bio END                 AS mentor_bio,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.mentorship_areas END           AS mentorship_areas,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.membership_tier END            AS membership_tier,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.school_number END              AS school_number,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_membership_status END   AS fonzip_membership_status,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_tags END                AS fonzip_tags,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_checked_at END          AS fonzip_checked_at,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.updated_at END                 AS updated_at
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profiles SET (security_invoker = false);

GRANT SELECT ON public.member_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Narrow the profiles SELECT policy to match the view.
-- ---------------------------------------------------------------------------
--
-- Same rule as member_sees_full_profile, one row-level step coarser: reading
-- the table at all now requires being the row's owner, a dues-paying member,
-- or staff. Everyone else reads members through the view, which is what the
-- client now does everywhere except for a member's own row.
--
-- To roll back, a single statement restores the previous behaviour:
--   DROP POLICY "authenticated_read_profiles" ON profiles;
--   CREATE POLICY "authenticated_read_profiles" ON profiles
--     FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id                         -- your own row, always, in full
    OR public.is_dernek_uyesi(auth.uid())   -- carries the Fonzip "Dernek Üyesi" tag
    OR public.is_staff(auth.uid())          -- admin / moderator
  );

-- Server-side code (pages/api/**, lib/requireMember.ts) uses the service-role
-- client and is unaffected: it bypasses RLS by design.

NOTIFY pgrst, 'reload schema';
