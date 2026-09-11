-- Backfill profession_group from the current distinct `profession` values,
-- reviewed by the user against a live SQL Editor query
-- (SELECT DISTINCT profession, count(*) FROM profiles GROUP BY profession
-- ORDER BY count DESC) on 2026-09-11. Exact-string match: `profession` is
-- free text, so this only maps the values that existed at that time — a
-- member typing something new later just leaves profession_group null until
-- a future backfill (or until they pick a group themselves in the profile
-- form, which is unaffected by this).
--
-- A handful of entries name more than one occupation and had to be assigned
-- to a single group by judgment call; check these against the member's
-- actual profile before relying on the group for anything more than a
-- rough directory filter:
--   'Akademisyen sporcu'                          -> Eğitim ve Akademi (an academic first; "sporcu" reads as a qualifier, not the profession)
--   'Gümrük Müşavirliği - Oyuncu Temsilciliği'     -> Lojistik, Ulaştırma ve Tedarik Zinciri (customs brokerage; listed first)
--   'inşaat ve finansal yatırım'                    -> İnşaat ve Gayrimenkul (listed first)
--   'Yurt dışı pazarlama - iç mimarlık'             -> Pazarlama, Reklam ve İletişim (listed first)
--   'Yazar, çevirmen, koç, yoga eğitmeni'           -> Diğer (four unrelated fields, no single group fits)
--   'Çevirmen'                                      -> Diğer (no dedicated "language services" group)
--   'Ev hanımı'                                     -> Diğer (not an occupation the taxonomy has a group for)
--   'Genetik Mühendisi'                             -> Mühendislik ve Teknoloji (job title uses "mühendis"; could also read as Sağlık ve Tıp)
-- Values not listed here mapped to one clearly-fitting group.

UPDATE profiles SET profession_group = CASE profession
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
