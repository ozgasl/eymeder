-- Event Management Tables
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  capacity INTEGER,
  image_url TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('attending', 'maybe', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- RLS Policies for Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_approved_events" ON events FOR SELECT USING (is_approved = true OR organizer_id = auth.uid());
CREATE POLICY "auth_create_events" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizer_update_events" ON events FOR UPDATE USING (organizer_id = auth.uid());
CREATE POLICY "organizer_delete_events" ON events FOR DELETE USING (organizer_id = auth.uid());

-- RLS Policies for Event Attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_attendees" ON event_attendees FOR SELECT USING (true);
CREATE POLICY "user_manage_attendance" ON event_attendees FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_update_attendance" ON event_attendees FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_delete_attendance" ON event_attendees FOR DELETE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);