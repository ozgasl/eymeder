-- Lets a brand list its Instagram/X handles and, optionally, which alumnus
-- the discount deal is connected to (e.g. a member who owns or arranged it).
ALTER TABLE brands ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS connected_member_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brands_connected_member ON brands(connected_member_id);
