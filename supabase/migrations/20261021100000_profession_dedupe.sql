-- Meslek (serbest metin) değerlerindeki çift ve benzer kayıtları birleştirir.
-- Önce tüm değerler TRIM'lenir (görünmeyen sondaki boşluklar 'Akademisyen' /
-- 'Akademisyen ' gibi çiftlere yol açıyordu), sonra yazım/büyük-küçük harf
-- farkları ve eş anlamlılar tek bir kanonik değere indirilir.
-- profession_group yalnızca meslek değeri değişen ve grubu hatalı olan
-- 'Finans ' satırı için düzeltilir.

UPDATE profiles SET profession = TRIM(profession)
WHERE profession IS NOT NULL AND profession <> TRIM(profession);

UPDATE profiles SET profession = CASE profession
  WHEN 'Eğitim' THEN 'Eğitimci'
  WHEN 'EĞİTİMCİ' THEN 'Eğitimci'
  WHEN 'MÜHENDİSLİK ÖĞRENCİSİ' THEN 'Mühendislik Öğrencisi'
  WHEN 'Sigorta Brokeri' THEN 'Sigortacı'
  WHEN 'Y. Mimar' THEN 'Mimar'
  ELSE profession
END
WHERE profession IN ('Eğitim', 'EĞİTİMCİ', 'MÜHENDİSLİK ÖĞRENCİSİ', 'Sigorta Brokeri', 'Y. Mimar');

UPDATE profiles SET profession_group = 'Finans, Bankacılık ve Muhasebe'
WHERE profession = 'Finans' AND profession_group IS DISTINCT FROM 'Finans, Bankacılık ve Muhasebe';
