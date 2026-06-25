-- Create brands table for discount partner companies
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  discount_info TEXT NOT NULL,
  category TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_qr_codes table for unique QR codes per user
CREATE TABLE IF NOT EXISTS user_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS policies for brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_brands" ON brands;
CREATE POLICY "public_read_brands" ON brands 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_brands" ON brands;
CREATE POLICY "admin_manage_brands" ON brands 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

-- RLS policies for user_qr_codes
ALTER TABLE user_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_qr" ON user_qr_codes;
CREATE POLICY "users_read_own_qr" ON user_qr_codes 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_manage_qr" ON user_qr_codes;
CREATE POLICY "admin_manage_qr" ON user_qr_codes 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE roles.user_id = auth.uid() 
      AND roles.role IN ('admin', 'moderator')
    )
  );

-- Function to auto-generate QR code on profile creation
CREATE OR REPLACE FUNCTION generate_user_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_qr_codes (user_id, qr_code)
  VALUES (
    NEW.id,
    'EYMDER-' || UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8))
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_generate_qr ON profiles;

-- Trigger to auto-generate QR on new profile
CREATE TRIGGER on_profile_created_generate_qr
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_user_qr_code();

-- Create indexes for performance (using IF NOT EXISTS to avoid errors)
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_user_qr_codes_user ON user_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qr_codes_code ON user_qr_codes(qr_code);

-- Backfill missing QR codes for existing users
INSERT INTO user_qr_codes (user_id, qr_code)
SELECT id, 'EYMDER-' || UPPER(SUBSTRING(MD5(id::text || NOW()::text) FROM 1 FOR 8))
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_qr_codes)
ON CONFLICT (user_id) DO NOTHING;