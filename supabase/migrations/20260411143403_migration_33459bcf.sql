-- Add public SELECT policy for membership validation
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "public_select_membership" ON membership_numbers;
  
  -- Create new policy allowing anyone to SELECT (for validation during signup)
  CREATE POLICY "public_select_membership" ON membership_numbers
    FOR SELECT
    USING (true);
    
  -- Ensure RLS is enabled
  ALTER TABLE membership_numbers ENABLE ROW LEVEL SECURITY;
END
$$;