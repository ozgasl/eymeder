-- Drop the single-university columns now that profile_universities has
-- fully replaced them (backfilled + verified in 20260911190000 /
-- 20260911180000, standardized and cleaned in the PR #29/#30 migrations).
-- No app code reads profiles.university/university_status/
-- university_graduation_year any more — profile.tsx, directory.tsx and
-- profileService.ts all read/write profile_universities (or its masked view,
-- member_profile_universities) instead.
--
-- member_profiles SELECTs these three columns, so they must come out of the
-- view FIRST. CREATE OR REPLACE VIEW cannot remove or reorder output
-- columns (only append at the end — see 20260911170000's own comment for
-- the append-only mistake made once already); removing a column requires a
-- real DROP + CREATE. That in turn requires re-stating security_invoker and
-- the GRANT, since a fresh view starts without either.

DROP VIEW public.member_profiles;

CREATE VIEW public.member_profiles AS
SELECT
  -- Always visible: this is what a non-dernek-üyesi member may see of another.
  p.id,
  p.full_name,
  p.graduation_year,
  -- Not personal data, and the mentorship list filters on it.
  p.is_mentor,
  -- Ordering key used by the directory and the admin panel.
  p.created_at,
  -- A picture next to a name everyone already sees adds nothing to mask.
  p.avatar_url,

  -- Everything else is visible only to the member themselves, to a dues-paying
  -- member, or to staff. is_dernek_uyesi/is_staff are SECURITY DEFINER, so a
  -- view over profiles asking them cannot recurse back into profiles RLS.
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.email END                      AS email,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.phone END                      AS phone,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.bio END                        AS bio,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.city END                       AS city,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.country END                    AS country,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.company END                    AS company,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.profession END                 AS profession,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.department END                 AS department,
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
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.profession_group END           AS profession_group,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.updated_at END                 AS updated_at
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profiles SET (security_invoker = false);

GRANT SELECT ON public.member_profiles TO anon, authenticated;

-- The index on university is dropped automatically along with the column.
ALTER TABLE profiles
  DROP COLUMN university,
  DROP COLUMN university_status,
  DROP COLUMN university_graduation_year;

NOTIFY pgrst, 'reload schema';
