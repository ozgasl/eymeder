-- News Feed & Community Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT CHECK (post_type IN ('announcement', 'update', 'question', 'share')) DEFAULT 'update',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (T2 - Public read, authenticated write)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_posts" ON posts FOR SELECT USING (true);
CREATE POLICY "auth_insert_posts" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_own_posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_own_posts" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "public_read_likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "auth_insert_likes" ON post_likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_own_likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "public_read_comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "auth_insert_comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_own_comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_own_comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);