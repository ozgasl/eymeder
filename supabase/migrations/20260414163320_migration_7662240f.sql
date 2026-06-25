-- Add new profile fields for enhanced filtering and contact info
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS high_school_graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS university_status TEXT CHECK (university_status IN ('studying', 'graduated')),
  ADD COLUMN IF NOT EXISTS university_graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_high_school_year ON profiles(high_school_graduation_year);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_profession ON profiles(profession);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company);