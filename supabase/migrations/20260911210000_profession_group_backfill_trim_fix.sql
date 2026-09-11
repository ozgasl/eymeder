-- Fix-up for 20260911200000: 5 rows didn't get a profession_group because
-- their `profession` value carries a trailing space that wasn't visible in
-- the SQL Editor's rendered table ('Akademisyen ', 'İK Uzmanı ', 'Makine
-- Mühendisi ', 'Giyim Tasarım (career break) ', 'Serbest ' — confirmed via
-- encode(convert_to(profession, 'UTF8'), 'hex'), each ending in `20`), so the
-- exact-string CASE in that migration never matched them.
--
-- Re-running the same mapping against TRIM(profession) instead of
-- `profession` fixes these and is harmless for everything else: it only
-- touches rows still missing a group (WHERE profession_group IS NULL AND
-- profession IS NOT NULL), so already-backfilled rows and genuinely-null
-- `profession` rows are untouched.

UPDATE profiles SET profession_group = CASE TRIM(profession)
  WHEN 'Doktor' THEN 'Sağlık ve Tıp'
  WHEN 'Akademisyen' THEN 'Eğitim ve Akademi'
  WHEN 'Akademisyen sporcu' THEN 'Eğitim ve Akademi'
  WHEN 'Avukat' THEN 'Hukuk'
  WHEN 'Çevirmen' THEN 'Diğer'
  WHEN 'Content Executive' THEN 'Pazarlama, Reklam ve İletişim'
  WHEN 'Danışman' THEN 'Danışmanlık'
  WHEN 'Dijital Dönüşüm Uzmanı' THEN 'Yazılım ve Bilişim'
  WHEN 'Diş Hekimi' THEN 'Sağlık ve Tıp'
  WHEN 'Doktora Öğrencisi' THEN 'Eğitim ve Akademi'
  WHEN 'Eğitim' THEN 'Eğitim ve Akademi'
  WHEN 'EĞİTİMCİ' THEN 'Eğitim ve Akademi'
  WHEN 'Ev hanımı' THEN 'Diğer'
  WHEN 'Finans' THEN 'Finans, Bankacılık ve Muhasebe'
  WHEN 'Fizyoterapist ve Diyetisyen' THEN 'Sağlık ve Tıp'
  WHEN 'Genetik Mühendisi' THEN 'Mühendislik ve Teknoloji'
  WHEN 'Giyim Tasarım (career break)' THEN 'Sanat ve Tasarım'
  WHEN 'Gümrük Müşavirliği - Oyuncu Temsilciliği' THEN 'Lojistik, Ulaştırma ve Tedarik Zinciri'
  WHEN 'İK Uzmanı' THEN 'İnsan Kaynakları'
  WHEN 'İnşaat mühendisi/müteahhit' THEN 'İnşaat ve Gayrimenkul'
  WHEN 'inşaat ve finansal yatırım' THEN 'İnşaat ve Gayrimenkul'
  WHEN 'İnsan Kaynakları Danışmanı, ICF sertifikali Koç, HeadHunter' THEN 'İnsan Kaynakları'
  WHEN 'Makine Mühendisi' THEN 'Mühendislik ve Teknoloji'
  WHEN 'Marka Vekili ve Patent Vekili' THEN 'Hukuk'
  WHEN 'Mühendis' THEN 'Mühendislik ve Teknoloji'
  WHEN 'Serbest' THEN 'Girişimcilik / Kendi İşi'
  WHEN 'Serbest Ticaret' THEN 'Girişimcilik / Kendi İşi'
  WHEN 'Sigortacı' THEN 'Sigortacılık'
  WHEN 'Turizm' THEN 'Turizm, Otelcilik ve Gastronomi'
  WHEN 'Veteriner Hekim' THEN 'Sağlık ve Tıp'
  WHEN 'Y. Mimar' THEN 'Mimarlık ve İç Mimarlık'
  WHEN 'Yazar, çevirmen, koç, yoga eğitmeni' THEN 'Diğer'
  WHEN 'Yurt dışı pazarlama - iç mimarlık' THEN 'Pazarlama, Reklam ve İletişim'
  ELSE profession_group
END
WHERE profession IS NOT NULL
  AND profession_group IS NULL;
