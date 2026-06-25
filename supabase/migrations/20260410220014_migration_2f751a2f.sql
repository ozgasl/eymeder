-- Membership numbers table for Excel import
CREATE TABLE membership_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_number TEXT NOT NULL UNIQUE CHECK (length(membership_number) = 8),
  email TEXT,
  full_name TEXT,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Extend profiles table for alumni data
ALTER TABLE profiles
ADD COLUMN graduation_year INTEGER,
ADD COLUMN department TEXT,
ADD COLUMN profession TEXT,
ADD COLUMN company TEXT,
ADD COLUMN city TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN membership_number TEXT UNIQUE REFERENCES membership_numbers(membership_number) ON DELETE SET NULL;

-- Messages table for real-time chat
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Connections table for networking (LinkedIn-style)
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Activity points for gamification
CREATE TABLE activity_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Badges for gamification
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_name)
);

-- User roles for admin panel
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_activity_points_user ON activity_points(user_id);
CREATE INDEX idx_badges_user ON badges(user_id);
CREATE INDEX idx_membership_numbers_number ON membership_numbers(membership_number);

-- RLS Policies

-- Membership numbers: Public read for signup validation
ALTER TABLE membership_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view unused membership numbers" ON membership_numbers
  FOR SELECT USING (is_used = false);
CREATE POLICY "Admins can manage membership numbers" ON membership_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Messages: Users can read their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Connections: Users can manage their connections
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their connections" ON connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create connection requests" ON connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update received requests" ON connections
  FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own requests" ON connections
  FOR DELETE USING (auth.uid() = requester_id);

-- Activity points: Public read, system writes
ALTER TABLE activity_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all activity points" ON activity_points
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can earn points" ON activity_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges: Public read, system writes
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all badges" ON badges
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can earn badges" ON badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Roles: Public read for role checking, admins manage
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-create member role on signup
CREATE OR REPLACE FUNCTION create_member_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_member_role();