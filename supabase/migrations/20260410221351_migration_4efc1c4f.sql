-- Connections table for network requests (LinkedIn-style)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- Safely add RLS Policies for connections
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'users_can_view_their_connections'
  ) THEN
    CREATE POLICY "users_can_view_their_connections" ON connections
      FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'users_can_create_connection_requests'
  ) THEN
    CREATE POLICY "users_can_create_connection_requests" ON connections
      FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'users_can_update_received_requests'
  ) THEN
    CREATE POLICY "users_can_update_received_requests" ON connections
      FOR UPDATE USING (auth.uid() = receiver_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'connections' AND policyname = 'users_can_delete_their_requests'
  ) THEN
    CREATE POLICY "users_can_delete_their_requests" ON connections
      FOR DELETE USING (auth.uid() = requester_id);
  END IF;
END
$$;