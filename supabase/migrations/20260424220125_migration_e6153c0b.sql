-- E-COMMERCE TABLES FOR MEZUN STORE

-- 1. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  image_url TEXT,
  images TEXT[], -- Multiple images
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  sku TEXT UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(featured);

-- 2. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_zip TEXT,
  shipping_phone TEXT NOT NULL,
  notes TEXT,
  iyzico_payment_id TEXT,
  iyzico_conversation_id TEXT,
  payment_proof_url TEXT, -- For bank transfer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('bank_transfer', 'iyzico', 'payment_link')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- 3. Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 4. Shopping cart table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_items_user_product_unique UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- 5. Payment links table (for custom payment links)
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  link_code TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_links_code ON payment_links(link_code);
CREATE INDEX idx_payment_links_order ON payment_links(order_id);

-- RLS Policies

-- Products: Public read, admin/moderator write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "admin_manage_products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

-- Orders: Users can view/create own orders, admin can view all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_own_orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admin_view_all_orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "admin_update_orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

-- Order items: Can view if can view order
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_view_all_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "users_insert_order_items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Cart items: Users manage own cart
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Payment links: Public can use, admin can create
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_active_links" ON payment_links
  FOR SELECT USING (NOT is_used AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "admin_manage_payment_links" ON payment_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock after order
CREATE OR REPLACE FUNCTION update_product_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'confirmed' AND OLD.status != 'confirmed') THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND products.id = oi.product_id;
  END IF;
  
  IF (NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND products.id = oi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_order();