-- Groups & Forums System
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('city', 'industry', 'interest', 'class_year', 'other')),
  cover_image TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- RLS Policies for Groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_groups" ON groups FOR SELECT USING (true);
CREATE POLICY "auth_create_groups" ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "creator_update_groups" ON groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "creator_delete_groups" ON groups FOR DELETE USING (auth.uid() = created_by);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_members" ON group_members FOR SELECT USING (true);
CREATE POLICY "auth_join_group" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_leave_group" ON group_members FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_group_posts" ON group_posts FOR SELECT USING (true);
CREATE POLICY "member_create_posts" ON group_posts FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_posts.group_id AND user_id = auth.uid())
);
CREATE POLICY "author_update_posts" ON group_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "author_delete_posts" ON group_posts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE group_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_group_likes" ON group_post_likes FOR SELECT USING (true);
CREATE POLICY "auth_like_group_posts" ON group_post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_unlike_group_posts" ON group_post_likes FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_post_likes_post ON group_post_likes(post_id);