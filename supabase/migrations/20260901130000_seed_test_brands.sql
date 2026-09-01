-- A few sample brands so QR-code discount flow can be tested end-to-end
-- while the admin brand-creation form is verified separately. Safe to
-- re-run: skipped if a brand with the same name already exists.
INSERT INTO brands (name, category, description, discount_info, is_active, display_order)
SELECT * FROM (VALUES
  ('Test Kafe', 'Yeme-İçme', 'Mezunlara özel test indirimi', '%10 indirim', true, 1),
  ('Test Teknoloji Mağazası', 'Teknoloji', 'Mezunlara özel test indirimi', '%15 indirim', true, 2),
  ('Test Kitabevi', 'Eğitim', 'Mezunlara özel test indirimi', '%20 indirim', true, 3)
) AS seed(name, category, description, discount_info, is_active, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE brands.name = seed.name
);
