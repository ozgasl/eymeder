-- Backfill: copy each profile's existing single university into
-- profile_universities, so nobody has to re-enter it once the app switches
-- to the multi-university UI. Deliberately NOT dropping
-- profiles.university/university_status/university_graduation_year here —
-- that happens in a later session once the new code path is confirmed in
-- production (see 20260911180000).
--
-- Idempotent: safe to re-run (e.g. after a profile's university changed
-- before the app cut over) because it skips profiles that already have a
-- row here.
INSERT INTO profile_universities (profile_id, university, status, graduation_year, sort_order)
SELECT id, university, university_status, university_graduation_year, 0
FROM profiles p
WHERE university IS NOT NULL
  AND university <> ''
  AND NOT EXISTS (
    SELECT 1 FROM profile_universities pu WHERE pu.profile_id = p.id
  );
