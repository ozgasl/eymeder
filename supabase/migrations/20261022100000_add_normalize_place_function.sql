-- SQL twin of normalizePlace() (src/lib/placeNormalize.ts): a comparison key
-- for places typed by hand, so SQL counts ("same city", "same country" on the
-- home page) compare them the way the app does — "İstanbul", "istanbul",
-- "Istanbul" and "ISTANBUL" all become "istanbul".
--
-- Turkish capitals are lowered by explicit translate() rather than lower():
-- lower() follows the database locale, and under a non-Turkish (or C) locale
-- it would turn İ into i + combining dot and leave Ç/Ş/Ğ/Ö/Ü capitals alone,
-- which is exactly what must not happen here. After that every remaining
-- letter is ASCII-case or already lowercase, and the Turkish letters fold to
-- their ASCII forms. Keep in step with normalizePlace().
CREATE OR REPLACE FUNCTION public.normalize_place(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT translate(
    lower(translate(btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')), 'İIÇĞÖŞÜÂÎÛ', 'iıçğöşüâîû')),
    'ıâîûçğöşü',
    'iaiucgosu'
  );
$$;
