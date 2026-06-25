CREATE TABLE IF NOT EXISTS mentorship_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own requests" ON mentorship_requests FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Users can create requests" ON mentorship_requests FOR INSERT WITH CHECK (auth.uid() = mentee_id);
CREATE POLICY "Mentors can update requests" ON mentorship_requests FOR UPDATE USING (auth.uid() = mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentor ON mentorship_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_mentee ON mentorship_requests(mentee_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentorship_areas TEXT[];