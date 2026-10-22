-- Home page stats, part 2: "kaç üye aynı üniversiteden / şehirde / ülkede".
--
-- get_home_stats_v2(): get_home_stats() (20260913120000) plus, for the signed-in
-- member:
--   university / university_count  the member's most shared university and how
--                                  many members have it (any status, any of
--                                  their own universities: the biggest wins)
--   city / city_count              same country AND same city
--   country / country_count        same country
-- NULL when the member hasn't filled the field in (the home page then asks
-- them to complete their profile).
--
-- Same reason as the original for SECURITY DEFINER: member_profiles masks city
-- and country for anyone who isn't a dernek üyesi, so counting against it
-- would undercount. The function returns counts only, never another member's
-- row. Places are compared through public.normalize_place() so "İstanbul" and
-- "istanbul" are one place, as in the app.
--
-- Why a new function and not a changed get_home_stats(): the return columns
-- change, which CREATE OR REPLACE cannot do, and the alternative (DROP +
-- CREATE) is a destructive statement that the Supabase MCP holds for a human
-- confirmation, so it timed out three times unattended. A second function also
-- needs no deploy ordering: the deployed client keeps calling the old one until
-- the new client ships. Once nothing calls get_home_stats() any more, drop it
-- in a follow-up migration.
CREATE OR REPLACE FUNCTION public.get_home_stats_v2()
RETURNS TABLE (
  cohort_year integer,
  cohort_count integer,
  profession_group text,
  profession_group_count integer,
  new_this_week_count integer,
  university text,
  university_count integer,
  city text,
  city_count integer,
  country text,
  country_count integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      p.graduation_year,
      p.profession_group,
      nullif(btrim(p.country), '') AS country,
      nullif(btrim(p.city), '') AS city
    FROM profiles p
    WHERE p.id = auth.uid()
  ),
  -- One row per distinct (normalized) university of mine, with how many
  -- members have it; the most shared one is kept (ties: alphabetical).
  top_university AS (
    SELECT mine.university, count(DISTINCT theirs.profile_id)::int AS n
    FROM (
      SELECT DISTINCT ON (public.normalize_place(pu.university))
        pu.university,
        public.normalize_place(pu.university) AS k
      FROM profile_universities pu
      WHERE pu.profile_id = auth.uid() AND public.normalize_place(pu.university) <> ''
      ORDER BY public.normalize_place(pu.university), pu.sort_order, pu.created_at
    ) mine
    JOIN profile_universities theirs ON public.normalize_place(theirs.university) = mine.k
    GROUP BY mine.university
    ORDER BY n DESC, mine.university
    LIMIT 1
  )
  SELECT
    me.graduation_year AS cohort_year,
    CASE WHEN me.graduation_year IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p WHERE p.graduation_year = me.graduation_year)
    END AS cohort_count,
    me.profession_group,
    CASE WHEN me.profession_group IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p WHERE p.profession_group = me.profession_group)
    END AS profession_group_count,
    (SELECT count(*)::int FROM profiles p WHERE p.created_at >= now() - interval '7 days') AS new_this_week_count,
    (SELECT tu.university FROM top_university tu) AS university,
    (SELECT tu.n FROM top_university tu) AS university_count,
    me.city,
    CASE WHEN me.city IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p
       WHERE public.normalize_place(p.city) = public.normalize_place(me.city)
         AND nullif(public.normalize_place(p.country), '') IS NOT DISTINCT FROM nullif(public.normalize_place(me.country), ''))
    END AS city_count,
    me.country,
    CASE WHEN me.country IS NOT NULL THEN
      (SELECT count(*)::int FROM profiles p
       WHERE public.normalize_place(p.country) = public.normalize_place(me.country))
    END AS country_count
  FROM me;
$$;

-- Not granted to anon: the home page only shows this section to signed-in
-- members, and auth.uid() is NULL for anon anyway (matches nothing above).
GRANT EXECUTE ON FUNCTION public.get_home_stats_v2() TO authenticated;

NOTIFY pgrst, 'reload schema';
