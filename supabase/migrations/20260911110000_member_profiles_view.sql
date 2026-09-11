-- Column-level visibility for member profiles (stage 2, step 1 of 2).
--
-- RLS is row-level: 20260911100000 could stop a member writing someone else's
-- row and stop a logged-out visitor reading any, but not stop a signed-in
-- mezun_uye reading everyone's email and phone. That needs per-column rules,
-- which only a view can express.
--
-- The rule, as the association set it: a member carrying the Fonzip
-- "Dernek Üyesi" tag (membership_tier = 'dernek_uyesi') sees everything.
-- Everyone else sees name, school and graduation year, and nothing more.
--
-- This step only ADDS the view and leaves the profiles policies alone, so
-- nothing changes for any page yet. One service is switched over to it in the
-- same change to confirm PostgREST can embed a view through the foreign key of
-- its base table — the one thing about this design that could not be checked
-- without a live API. The remaining services and the narrowing of the profiles
-- SELECT policy follow once that is confirmed.

-- One place to state the rule, so 24 CASE expressions cannot drift apart.
-- SECURITY DEFINER and STABLE like its two callees: a view over profiles that
-- asked profiles directly would re-enter that table's RLS.
CREATE OR REPLACE FUNCTION public.member_sees_full_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      profile_id = auth.uid()                 -- your own row
      OR public.is_dernek_uyesi(auth.uid())   -- carries the Fonzip "Dernek Üyesi" tag
      OR public.is_staff(auth.uid())          -- admin / moderator
    );
$$;

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
FROM public.profiles p;

-- security_invoker stays false so the view reads profiles as its owner: the
-- point is that the masking above, not the table's policies, decides what a
-- caller gets. Supabase's linter flags this; it is deliberate.
ALTER VIEW public.member_profiles SET (security_invoker = false);

GRANT SELECT ON public.member_profiles TO authenticated;
