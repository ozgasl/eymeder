-- Store product options: fixed categories, per-size stock for clothing,
-- buyer-chosen graduation year, and the columns a payment provider will need.

-- 1. Categories -------------------------------------------------------------
-- TRIM first: free-text values may carry invisible trailing whitespace.
UPDATE products SET category = CASE
  WHEN LOWER(TRIM(category)) IN ('giyim', 'tekstil') THEN 'Giyim'
  WHEN LOWER(TRIM(category)) = 'elektronik' THEN 'Elektronik'
  WHEN LOWER(TRIM(category)) IN ('baskılı ürünler', 'baskili urunler', 'baskılı ürün') THEN 'Baskılı Ürünler'
  WHEN LOWER(TRIM(category)) IN ('okul ürünleri', 'okul urunleri', 'kırtasiye') THEN 'Okul Ürünleri'
  WHEN LOWER(TRIM(category)) IN ('hediyelik eşyalar', 'hediyelik esyalar', 'hediyelik', 'hediyelik eşya') THEN 'Hediyelik Eşyalar'
  ELSE category
END
WHERE category IS NOT NULL;

-- NOT VALID: rows left over from the free-text era that match nothing above
-- keep working until an admin recategorises them, but every new write is checked.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IS NULL OR category IN
    ('Baskılı Ürünler', 'Elektronik', 'Giyim', 'Hediyelik Eşyalar', 'Okul Ürünleri'))
  NOT VALID;

-- 2. Per-size stock (clothing only) ----------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_variants_size_check CHECK (size IN ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL')),
  CONSTRAINT product_variants_stock_check CHECK (stock_quantity >= 0),
  CONSTRAINT product_variants_product_size_unique UNIQUE (product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_product_variants" ON product_variants;
CREATE POLICY "public_read_product_variants" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND p.is_active = true)
  );

DROP POLICY IF EXISTS "staff_manage_product_variants" ON product_variants;
CREATE POLICY "staff_manage_product_variants" ON product_variants
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 3. Size + graduation year on cart and order lines -------------------------
ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_graduation_year_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_graduation_year_check
  CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1992 AND 2027);

-- The same product may sit in the cart once per size and graduation year.
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_unique;
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_options_unique
  ON cart_items (
    user_id,
    product_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(graduation_year, 0)
  );

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_graduation_year_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_graduation_year_check
  CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1992 AND 2027);

-- Clothing needs a size of that product and a year; printed products need a
-- year. Enforced here because the cart is written straight from the browser.
CREATE OR REPLACE FUNCTION validate_item_options()
RETURNS TRIGGER AS $$
DECLARE
  prod_category TEXT;
  variant_product UUID;
BEGIN
  SELECT category INTO prod_category FROM products WHERE id = NEW.product_id;

  IF prod_category = 'Giyim' THEN
    IF NEW.variant_id IS NULL THEN
      RAISE EXCEPTION 'Giyim ürünleri için beden seçimi zorunludur';
    END IF;
    SELECT product_id INTO variant_product FROM product_variants WHERE id = NEW.variant_id;
    IF variant_product IS DISTINCT FROM NEW.product_id THEN
      RAISE EXCEPTION 'Seçilen beden bu ürüne ait değil';
    END IF;
  ELSIF NEW.variant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bu ürün için beden seçilemez';
  END IF;

  IF prod_category IN ('Giyim', 'Baskılı Ürünler') THEN
    IF NEW.graduation_year IS NULL THEN
      RAISE EXCEPTION 'Mezuniyet yılı seçimi zorunludur';
    END IF;
  ELSIF NEW.graduation_year IS NOT NULL THEN
    RAISE EXCEPTION 'Bu ürün için mezuniyet yılı seçilemez';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_cart_item_options ON cart_items;
CREATE TRIGGER trigger_validate_cart_item_options
  BEFORE INSERT OR UPDATE OF product_id, variant_id, graduation_year ON cart_items
  FOR EACH ROW EXECUTE FUNCTION validate_item_options();

DROP TRIGGER IF EXISTS trigger_validate_order_item_options ON order_items;
CREATE TRIGGER trigger_validate_order_item_options
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION validate_item_options();

-- 4. Stock follows the size for clothing, the product otherwise -------------
-- Stock is taken when an order is confirmed and given back only when an order
-- that already took it is cancelled (the old version also restocked orders
-- cancelled while still pending, which never took any).
CREATE OR REPLACE FUNCTION update_product_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'confirmed' AND OLD.status = 'pending') THEN
    UPDATE product_variants v
    SET stock_quantity = GREATEST(v.stock_quantity - oi.quantity, 0), updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = v.id;

    UPDATE products p
    SET stock_quantity = GREATEST(p.stock_quantity - oi.quantity, 0), updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id IS NULL AND p.id = oi.product_id;
  END IF;

  IF (NEW.status = 'cancelled' AND OLD.status IN ('confirmed', 'processing', 'shipped')) THEN
    UPDATE product_variants v
    SET stock_quantity = v.stock_quantity + oi.quantity, updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = v.id;

    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity, updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id IS NULL AND p.id = oi.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Product images bucket --------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "staff_insert_product_images" ON storage.objects;
CREATE POLICY "staff_insert_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_update_product_images" ON storage.objects;
CREATE POLICY "staff_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_delete_product_images" ON storage.objects;
CREATE POLICY "staff_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

-- 6. Payment provider groundwork --------------------------------------------
-- No provider is chosen yet; these columns stay provider-neutral.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A provider may deliver the same callback twice; this makes handling idempotent.
  CONSTRAINT payment_events_provider_event_unique UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id);

-- Written only by the server (service role, which bypasses RLS); staff may read.
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_payment_events" ON payment_events;
CREATE POLICY "staff_read_payment_events" ON payment_events
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
