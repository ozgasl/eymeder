-- What the location standardization (20261022100100_normalize_profile_locations_data)
-- could not place. Run in the Supabase SQL Editor; read-only.

-- 1. Countries in use, with how many members have each. Anything that is not
--    in src/lib/countries.ts (COUNTRY_NAMES) needs a manual look.
SELECT coalesce(country, '(boş)') AS country, count(*) AS members
FROM profiles
GROUP BY 1
ORDER BY members DESC, 1;

-- 2. Members in Türkiye whose city is not one of the 81 provinces (a district,
--    a typo...). The profile form asks them to pick a province.
SELECT city, count(*) AS members
FROM profiles
WHERE btrim(country) = 'Türkiye'
  AND city IS NOT NULL
  AND city NOT IN (
    'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
    'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur',
    'Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan',
    'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','İstanbul',
    'İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli',
    'Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
    'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop',
    'Şırnak','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'
  )
GROUP BY 1
ORDER BY members DESC, 1;

-- 3. A city but no country: the form cannot show the city until a country is picked.
SELECT city, count(*) AS members
FROM profiles
WHERE (country IS NULL OR btrim(country) = '') AND nullif(btrim(city), '') IS NOT NULL
GROUP BY 1
ORDER BY members DESC, 1;
