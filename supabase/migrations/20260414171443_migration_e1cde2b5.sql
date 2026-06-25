-- Media Gallery System
CREATE TABLE IF NOT EXISTS media_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  year INTEGER,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media_gallery(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(media_id, user_id)
);

-- News System
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Testimonials System
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  achievement TEXT,
  current_position TEXT,
  featured BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Media Gallery Policies
CREATE POLICY "public_read_media" ON media_gallery FOR SELECT USING (true);
CREATE POLICY "auth_insert_media" ON media_gallery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_media" ON media_gallery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_media" ON media_gallery FOR DELETE USING (auth.uid() = user_id);

-- Media Likes Policies
CREATE POLICY "public_read_media_likes" ON media_likes FOR SELECT USING (true);
CREATE POLICY "auth_insert_media_like" ON media_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete_media_like" ON media_likes FOR DELETE USING (auth.uid() = user_id);

-- News Policies
CREATE POLICY "public_read_news" ON news FOR SELECT USING (published = true);
CREATE POLICY "auth_insert_news" ON news FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "own_update_news" ON news FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "own_delete_news" ON news FOR DELETE USING (auth.uid() = author_id);

-- Testimonials Policies
CREATE POLICY "public_read_approved_testimonials" ON testimonials FOR SELECT USING (approved = true);
CREATE POLICY "auth_insert_testimonial" ON testimonials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_testimonial" ON testimonials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_testimonial" ON testimonials FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_gallery_user ON media_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_type ON media_gallery(media_type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_year ON media_gallery(year);
CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_testimonials_user ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(approved);

-- Storage bucket for media (run this in Supabase dashboard if not exists)
-- insert into storage.buckets (id, name, public) values ('media', 'media', true);