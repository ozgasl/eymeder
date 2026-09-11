-- One-time cleanup of the messy free-text `university` values entered
-- before this field had any guidance, reviewed against a live distinct-value
-- export on 2026-09-12. Three kinds of fixes, all matched on
-- TRIM(university) (not raw equality) because the previous profession_group
-- backfill already found members' free text carries invisible trailing
-- spaces that break exact matches — same risk here, confirmed present here
-- too (both "İstanbul Üniversitesi" and "Marmara Üniversitesi" existed as
-- two hidden-whitespace variants each).
--
-- 1. Typo/case/abbreviation fixes with no embedded department.
-- 2. Entries that mixed the department into the university field — split
--    into `university` + the new `department` column.
-- 3. One entry that named two different universities in one field (a
--    double-major) — split into two separate rows, now that a profile can
--    have more than one university. Its original status/graduation_year
--    (if any) applied to at most one of the two programs, so both new rows
--    get a clean slate for those columns rather than guessing which.

-- --- 1. Name-only fixes -----------------------------------------------
UPDATE profile_universities SET university = CASE TRIM(university)
  WHEN 'İstanbul Üniversitesi' THEN 'İstanbul Üniversitesi'
  WHEN 'İstanbul üniversitesi' THEN 'İstanbul Üniversitesi'
  WHEN 'İSTANBUL ÜNİVERSİTE' THEN 'İstanbul Üniversitesi'
  WHEN 'Marmara Üniversitesi' THEN 'Marmara Üniversitesi'
  WHEN 'Marmara' THEN 'Marmara Üniversitesi'
  WHEN 'Yeditepe' THEN 'Yeditepe Üniversitesi'
  WHEN 'Yeditepe Üniversitesi' THEN 'Yeditepe Üniversitesi'
  WHEN 'hesser college' THEN 'Hesser College'
  ELSE university
END
WHERE TRIM(university) IN (
  'İstanbul Üniversitesi', 'İstanbul üniversitesi', 'İSTANBUL ÜNİVERSİTE',
  'Marmara Üniversitesi', 'Marmara',
  'Yeditepe', 'Yeditepe Üniversitesi',
  'hesser college'
);

-- --- 2. Split embedded department out of the university field ---------
UPDATE profile_universities SET
  university = fixed.university,
  department = fixed.department
FROM (VALUES
  ('Ankara Üniversitesi Diş Hekimliği Fakültesi', 'Ankara Üniversitesi', 'Diş Hekimliği Fakültesi'),
  ('Gazi Üniversitesi IIBF İKTİSAT', 'Gazi Üniversitesi', 'İİBF İktisat'),
  ('İstanbul Üniversitesi iletişim f. Halkla İlişkiler ve Tanıtım', 'İstanbul Üniversitesi', 'İletişim Fakültesi Halkla İlişkiler ve Tanıtım'),
  ('İTÜ Makine Mühendisliği', 'İstanbul Teknik Üniversitesi', 'Makine Mühendisliği'),
  ('Marmara Üniversitesi Güzel Sanatlar', 'Marmara Üniversitesi', 'Güzel Sanatlar'),
  ('Yıldız Teknik Üniversitesi Makine Mühndisliği', 'Yıldız Teknik Üniversitesi', 'Makine Mühendisliği')
) AS fixed(original, university, department)
WHERE TRIM(profile_universities.university) = fixed.original;

-- --- 3. Split the one double-university entry into two rows -----------
WITH src AS (
  SELECT id, profile_id, sort_order
  FROM profile_universities
  WHERE TRIM(university) = 'ODTÜ Felsefe / Yıldız Teknik Üniveristesi İngilizce İşletme'
)
-- Explicit casts: a bare NULL with nothing else to infer a type from
-- defaults to text across a UNION, which then fails to insert into the
-- integer graduation_year column (42804) — cast both branches the same way.
INSERT INTO profile_universities (profile_id, university, department, status, graduation_year, sort_order)
SELECT profile_id, 'Orta Doğu Teknik Üniversitesi', 'Felsefe', NULL::text, NULL::integer, sort_order FROM src
UNION ALL
SELECT profile_id, 'Yıldız Teknik Üniversitesi', 'İngilizce İşletme', NULL::text, NULL::integer, sort_order + 1 FROM src;

DELETE FROM profile_universities
WHERE TRIM(university) = 'ODTÜ Felsefe / Yıldız Teknik Üniveristesi İngilizce İşletme';
