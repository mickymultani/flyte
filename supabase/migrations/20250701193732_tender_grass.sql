/*
  # Chat System Database Schema

  1. New Tables
    - `channels` - Chat channels/rooms for enterprises
    - `messages` - Chat messages within channels  
    - `channel_members` - Channel membership and roles

  2. Security
    - Enable RLS on all chat tables
    - Enterprise-based access control
    - Channel membership requirements
    - Super admin full access policies

  3. Features
    - Default channels (#general, #random) for existing enterprises
    - Automatic user membership setup
    - Real-time messaging support
    - File and image message types
*/

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
  created_by uuid NOT NULL, -- References auth.users but we'll validate via RLS
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enterprise_id, name)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- References auth.users but we'll validate via RLS
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'image')),
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- References auth.users but we'll validate via RLS
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channels_enterprise_id ON channels(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);

-- Create updated_at triggers (reuse existing function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_channels_updated_at'
  ) THEN
    CREATE TRIGGER update_channels_updated_at
      BEFORE UPDATE ON channels
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at'
  ) THEN
    CREATE TRIGGER update_messages_updated_at
      BEFORE UPDATE ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels
CREATE POLICY "Users can view channels in their enterprise"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create channels in their enterprise"
  ON channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Channel creators and admins can update channels"
  ON channels
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_id = channels.id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in channels they're members of"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to channels they're members of"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for channel_members
CREATE POLICY "Users can view members of channels they're in"
  ON channel_members
  FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Channel admins can manage members"
  ON channel_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_id = channel_members.channel_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can join public channels in their enterprise"
  ON channel_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (
      SELECT c.id FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE up.id = auth.uid() AND c.type = 'public'
    )
  );

-- Super admin policies (full access)
CREATE POLICY "Super admins have full access to channels"
  ON channels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins have full access to messages"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins have full access to channel members"
  ON channel_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create default channels for existing enterprises
DO $$
DECLARE
  enterprise_record RECORD;
  general_channel_id uuid;
  random_channel_id uuid;
  super_admin_id uuid;
BEGIN
  -- Get a super admin to use as channel creator
  SELECT id INTO super_admin_id 
  FROM admin_profiles 
  WHERE role = 'super_admin' 
  LIMIT 1;
  
  -- If no super admin exists, skip channel creation
  IF super_admin_id IS NULL THEN
    RAISE NOTICE 'No super admin found, skipping default channel creation';
    RETURN;
  END IF;
  
  FOR enterprise_record IN SELECT * FROM enterprises WHERE status = 'active' LOOP
    -- Create #general channel
    INSERT INTO channels (enterprise_id, name, description, type, created_by)
    VALUES (
      enterprise_record.id,
      'general',
      'General discussion for the team',
      'public',
      super_admin_id
    )
    RETURNING id INTO general_channel_id;
    
    -- Create #random channel
    INSERT INTO channels (enterprise_id, name, description, type, created_by)
    VALUES (
      enterprise_record.id,
      'random',
      'Random conversations and off-topic discussions',
      'public',
      super_admin_id
    )
    RETURNING id INTO random_channel_id;
    
    -- Add all users from this enterprise to both channels
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT general_channel_id, up.id, 'member'
    FROM user_profiles up
    WHERE up.enterprise_id = enterprise_record.id;
    
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT random_channel_id, up.id, 'member'
    FROM user_profiles up
    WHERE up.enterprise_id = enterprise_record.id;
    
    RAISE NOTICE 'Created default channels for enterprise: %', enterprise_record.name;
  END LOOP;
END $$;