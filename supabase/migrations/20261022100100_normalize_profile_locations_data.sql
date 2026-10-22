-- Standardize where members live, ahead of the "same city / same country"
-- home page tiles (see docs/superpowers/plans/2026-10-22-home-stats-location-university.md).
--
-- `profiles.country` / `profiles.city` have always been free text underneath
-- (a 9-item dropdown for country, a text box for city), so production held
-- "İstanbul", "istanbul" and "Istanbul" as three different places and a
-- catch-all country "Diğer". The profile form now picks the country from a
-- world list and, for Türkiye, the city from the 81 provinces
-- (src/lib/countries.ts, src/lib/turkishCities.ts). This rewrites the existing
-- rows onto those lists. Only rows that clearly map to one entry are touched;
-- anything else (a district typed as the city, a foreign city under a real
-- country) is left alone and shows up in docs/audits/location-normalize-audit.sql.
--
-- Needs public.normalize_place() from 20261022100000.
--
-- Idempotent: every UPDATE matches on the normalized value and skips rows that
-- already hold the canonical one. No temp table on purpose: the first version
-- used one and the Supabase MCP apply_migration call timed out (nothing was
-- applied), inline VALUES went through.

-- 1. The retired "Diğer" bucket: its members' cities say where they are.
--    Girne gets the city alone (the " - Kıbrıs" only said which country).
UPDATE profiles SET country = 'Belçika'
WHERE btrim(country) = 'Diğer' AND public.normalize_place(city) = 'bruksel';
UPDATE profiles SET country = 'Güney Afrika'
WHERE btrim(country) = 'Diğer' AND public.normalize_place(city) = 'cape town';
UPDATE profiles SET country = 'Yunanistan'
WHERE btrim(country) = 'Diğer' AND public.normalize_place(city) = 'selanik';
UPDATE profiles SET country = 'Kuzey Kıbrıs (KKTC)', city = 'Girne'
WHERE btrim(country) = 'Diğer' AND public.normalize_place(city) IN ('girne - kibris', 'girne');

-- Whatever is still "Diğer" cannot be placed: empty it so the profile form asks
-- again (an empty country simply counts as "not filled in").
UPDATE profiles SET country = NULL WHERE btrim(country) = 'Diğer';

-- 2. Province spelling for members in Türkiye (or with no country yet).
--    The 81 provinces, official spelling (same list as TURKISH_CITIES).
UPDATE profiles p SET city = tp.name
FROM (VALUES
  ('Adana'),('Adıyaman'),('Afyonkarahisar'),('Ağrı'),('Aksaray'),('Amasya'),('Ankara'),('Antalya'),('Ardahan'),('Artvin'),
  ('Aydın'),('Balıkesir'),('Bartın'),('Batman'),('Bayburt'),('Bilecik'),('Bingöl'),('Bitlis'),('Bolu'),('Burdur'),
  ('Bursa'),('Çanakkale'),('Çankırı'),('Çorum'),('Denizli'),('Diyarbakır'),('Düzce'),('Edirne'),('Elazığ'),('Erzincan'),
  ('Erzurum'),('Eskişehir'),('Gaziantep'),('Giresun'),('Gümüşhane'),('Hakkâri'),('Hatay'),('Iğdır'),('Isparta'),('İstanbul'),
  ('İzmir'),('Kahramanmaraş'),('Karabük'),('Karaman'),('Kars'),('Kastamonu'),('Kayseri'),('Kilis'),('Kırıkkale'),('Kırklareli'),
  ('Kırşehir'),('Kocaeli'),('Konya'),('Kütahya'),('Malatya'),('Manisa'),('Mardin'),('Mersin'),('Muğla'),('Muş'),
  ('Nevşehir'),('Niğde'),('Ordu'),('Osmaniye'),('Rize'),('Sakarya'),('Samsun'),('Şanlıurfa'),('Siirt'),('Sinop'),
  ('Şırnak'),('Sivas'),('Tekirdağ'),('Tokat'),('Trabzon'),('Tunceli'),('Uşak'),('Van'),('Yalova'),('Yozgat'),
  ('Zonguldak')
) AS tp(name)
WHERE p.city IS DISTINCT FROM tp.name
  AND public.normalize_place(p.city) = public.normalize_place(tp.name)
  AND (p.country IS NULL OR btrim(p.country) = '' OR btrim(p.country) = 'Türkiye');

-- 3. A province but no country: they live in Türkiye.
UPDATE profiles p SET country = 'Türkiye'
WHERE (p.country IS NULL OR btrim(p.country) = '')
  AND p.city IN (
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur',
  'Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan',
  'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','İstanbul',
  'İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli',
  'Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
  'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop',
  'Şırnak','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat',
  'Zonguldak');

-- 4. Stray whitespace around a country, so equality on it is reliable.
UPDATE profiles SET country = btrim(country) WHERE country <> btrim(country);

NOTIFY pgrst, 'reload schema';
