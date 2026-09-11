-- Two more hidden-trailing-space duplicates showed up in profile_universities
-- ("İstanbul Teknik Üniversitesi", "Yıldız Teknik Üniversitesi") AFTER the
-- 2026-09-12 standardization backfill was verified clean — so these were
-- written later, through the live app, not leftover old data. The client
-- already trims on submit (src/pages/profile.tsx), so this closes the gap at
-- the one place that actually guarantees it: the table itself. Whatever
-- writes here next (this form, an admin script, anything) can't reintroduce
-- the same bug.

-- 1. Clean up the two rows found live.
UPDATE profile_universities SET university = TRIM(university)
WHERE university <> TRIM(university);

UPDATE profile_universities SET department = NULLIF(TRIM(department), '')
WHERE department IS NOT NULL AND department <> TRIM(department);

-- 2. Guard: trim both text fields on every future write.
CREATE OR REPLACE FUNCTION public.trim_profile_university_text()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.university := TRIM(NEW.university);
  NEW.department := NULLIF(TRIM(NEW.department), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_profile_university_text ON profile_universities;
CREATE TRIGGER trim_profile_university_text
  BEFORE INSERT OR UPDATE ON profile_universities
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_profile_university_text();
