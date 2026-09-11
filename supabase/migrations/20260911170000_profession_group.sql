-- "Meslek Grubu" (profession group): a fixed-taxonomy companion to the
-- existing free-text `profession`. Members keep typing whatever they want
-- into `profession`; this is a separate, nullable column they pick from a
-- fixed list (src/lib/professionGroups.ts) so it can double as a reliable
-- directory filter, which free text can't. No backfill here — existing rows
-- get this column mapped from their `profession` value in a later migration,
-- once the actual distribution of `profession` values has been reviewed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession_group TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_profession_group ON profiles(profession_group);

-- member_profiles masks `profession` behind member_sees_full_profile() (only
-- the owner, a dues-paying member, or staff sees it) — profession_group is
-- the same kind of professional detail, so it gets the same treatment. This
-- is a straight copy of the view from 20260911140000 with one column added
-- at the end; that migration is already applied and is not touched, per the
-- project's own rule (see PROJECT_MEMORY.md).
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
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.updated_at END                 AS updated_at,
  -- Must stay LAST: CREATE OR REPLACE VIEW only allows appending new columns
  -- at the end — putting this before `updated_at` renames the view's last
  -- column instead of adding one, which Postgres rejects (42P16).
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.profession_group END           AS profession_group
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profiles SET (security_invoker = false);

GRANT SELECT ON public.member_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
