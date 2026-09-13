-- Home page stats: "kaç kişi aynı dönemden", "kaç kişi aynı meslek grubundan",
-- "son 1 haftada kaç yeni üye" for the currently signed-in member.
--
-- Why a SECURITY DEFINER function instead of querying member_profiles: that
-- view masks profession_group (and everything but id/full_name/graduation_year/
-- is_mentor/created_at/avatar_url) to NULL for anyone the viewer isn't
-- privileged to see in full (own row / dernek_uyesi / staff — see
-- member_sees_full_profile() in 20260911110000_member_profiles_view.sql). A
-- mezun_uye counting "kaç kişi benimle aynı meslek grubunda" against that view
-- would undercount, since every other mezun_uye's profession_group reads back
-- NULL to them. This function only ever returns counts, never another
-- member's row, so bypassing masking here doesn't leak anything the view is
-- meant to protect.
CREATE OR REPLACE FUNCTION public.get_home_stats()
RETURNS TABLE (
  cohort_year integer,
  cohort_count integer,
  profession_group text,
  profession_group_count integer,
  new_this_week_count integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    me.graduation_year AS cohort_year,
    CASE WHEN me.graduation_year IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p WHERE p.graduation_year = me.graduation_year)
    END AS cohort_count,
    me.profession_group,
    CASE WHEN me.profession_group IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p WHERE p.profession_group = me.profession_group)
    END AS profession_group_count,
    (SELECT count(*)::int FROM profiles p WHERE p.created_at >= now() - interval '7 days') AS new_this_week_count
  FROM profiles me
  WHERE me.id = auth.uid();
$$;

-- Not granted to anon: the home page only shows this section to signed-in
-- members, and auth.uid() is NULL for anon anyway (matches nothing above).
GRANT EXECUTE ON FUNCTION public.get_home_stats() TO authenticated;
