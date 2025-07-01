/*
  # Complete Airport Operations Schema Setup

  1. New Tables
    - `departments` - Airport departments (Security, Operations, etc.)
    - `shifts` - Shift management and handovers
    - `incidents` - Incident reporting and tracking
    - `tasks` - Task assignment and management
    - `announcements` - System-wide announcements
    - `contacts` - Staff directory and contact information

  2. Enhanced Tables
    - `user_profiles` - Added department_id, role, phone
    - `channels` - Added department_id for department-specific channels
    - `messages` - Added metadata for structured data

  3. Security
    - Enable RLS on all new tables
    - Add comprehensive policies for enterprise isolation
    - Super admin full access policies

  4. Default Data
    - Create default departments for each enterprise
    - Create WhatsApp-style channels including #flights
    - Auto-assign users to public channels
*/

-- Drop existing policies individually to avoid conflicts
DROP POLICY IF EXISTS "enterprise_users_view_departments" ON departments;
DROP POLICY IF EXISTS "super_admins_manage_departments" ON departments;
DROP POLICY IF EXISTS "enterprise_users_view_shifts" ON shifts;
DROP POLICY IF EXISTS "users_create_shifts" ON shifts;
DROP POLICY IF EXISTS "users_update_own_shifts" ON shifts;
DROP POLICY IF EXISTS "super_admins_manage_shifts" ON shifts;
DROP POLICY IF EXISTS "enterprise_users_view_incidents" ON incidents;
DROP POLICY IF EXISTS "users_create_incidents" ON incidents;
DROP POLICY IF EXISTS "users_update_assigned_incidents" ON incidents;
DROP POLICY IF EXISTS "super_admins_manage_incidents" ON incidents;
DROP POLICY IF EXISTS "enterprise_users_view_tasks" ON tasks;
DROP POLICY IF EXISTS "users_create_tasks" ON tasks;
DROP POLICY IF EXISTS "users_update_assigned_tasks" ON tasks;
DROP POLICY IF EXISTS "super_admins_manage_tasks" ON tasks;
DROP POLICY IF EXISTS "enterprise_users_view_announcements" ON announcements;
DROP POLICY IF EXISTS "supervisors_create_announcements" ON announcements;
DROP POLICY IF EXISTS "super_admins_manage_announcements" ON announcements;
DROP POLICY IF EXISTS "enterprise_users_view_contacts" ON contacts;
DROP POLICY IF EXISTS "super_admins_manage_contacts" ON contacts;
DROP POLICY IF EXISTS "enterprise_users_view_channels" ON channels;
DROP POLICY IF EXISTS "users_create_enterprise_channels" ON channels;
DROP POLICY IF EXISTS "channel_creators_update_channels" ON channels;
DROP POLICY IF EXISTS "super_admins_manage_channels" ON channels;
DROP POLICY IF EXISTS "channel_members_view_messages" ON messages;
DROP POLICY IF EXISTS "channel_members_send_messages" ON messages;
DROP POLICY IF EXISTS "users_update_own_messages" ON messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON messages;
DROP POLICY IF EXISTS "super_admins_manage_messages" ON messages;
DROP POLICY IF EXISTS "channel_members_view_members" ON channel_members;
DROP POLICY IF EXISTS "channel_admins_manage_members" ON channel_members;
DROP POLICY IF EXISTS "users_join_public_channels" ON channel_members;
DROP POLICY IF EXISTS "super_admins_manage_channel_members" ON channel_members;

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL, -- e.g., 'SEC', 'OPS', 'MAINT'
  description text,
  color text DEFAULT '#3B82F6', -- For UI theming
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enterprise_id, code)
);

-- Create shifts table for handovers
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g., 'Day Shift', 'Night Shift'
  start_time time NOT NULL,
  end_time time NOT NULL,
  handover_notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  assigned_to uuid REFERENCES user_profiles(id),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  location text,
  reported_by uuid NOT NULL REFERENCES user_profiles(id),
  assigned_to uuid REFERENCES user_profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  assigned_to uuid REFERENCES user_profiles(id),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert', 'emergency')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_departments uuid[], -- Array of department IDs
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table (staff directory)
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id),
  name text NOT NULL,
  role text NOT NULL,
  department_id uuid REFERENCES departments(id),
  phone text,
  radio_channel text,
  location text,
  shift_pattern text,
  emergency_contact boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'off_duty', 'unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add department and role columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'staff';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Add department_id to channels table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE channels ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;
END $$;

-- Update channels type constraint to include 'department'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'channels_type_check'
  ) THEN
    ALTER TABLE channels DROP CONSTRAINT channels_type_check;
  END IF;
  
  ALTER TABLE channels ADD CONSTRAINT channels_type_check 
    CHECK (type IN ('public', 'private', 'department'));
END $$;

-- Add metadata column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE messages ADD COLUMN metadata jsonb;
  END IF;
END $$;

-- Update messages type constraint to include new types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'messages_type_check'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_type_check;
  END IF;
  
  ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (type IN ('text', 'file', 'image', 'alert', 'handover'));
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_enterprise_id ON departments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_shifts_enterprise_id ON shifts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_shifts_department_id ON shifts(department_id);
CREATE INDEX IF NOT EXISTS idx_incidents_enterprise_id ON incidents(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_tasks_enterprise_id ON tasks(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_announcements_enterprise_id ON announcements(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_contacts_enterprise_id ON contacts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_contacts_department_id ON contacts(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department_id ON user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_channels_department_id ON channels(department_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "enterprise_users_view_departments"
  ON departments FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "super_admins_manage_departments"
  ON departments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for shifts
CREATE POLICY "enterprise_users_view_shifts"
  ON shifts FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "users_create_shifts"
  ON shifts FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "users_update_own_shifts"
  ON shifts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "super_admins_manage_shifts"
  ON shifts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for incidents
CREATE POLICY "enterprise_users_view_incidents"
  ON incidents FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "users_create_incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid())
    AND reported_by = auth.uid()
  );

CREATE POLICY "users_update_assigned_incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (reported_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "super_admins_manage_incidents"
  ON incidents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for tasks
CREATE POLICY "enterprise_users_view_tasks"
  ON tasks FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "users_create_tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "users_update_assigned_tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "super_admins_manage_tasks"
  ON tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for announcements
CREATE POLICY "enterprise_users_view_announcements"
  ON announcements FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "supervisors_create_announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "super_admins_manage_announcements"
  ON announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for contacts
CREATE POLICY "enterprise_users_view_contacts"
  ON contacts FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "super_admins_manage_contacts"
  ON contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for channels
CREATE POLICY "enterprise_users_view_channels"
  ON channels FOR SELECT TO authenticated
  USING (enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "users_create_enterprise_channels"
  ON channels FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (SELECT enterprise_id FROM user_profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "channel_creators_update_channels"
  ON channels FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_id = channels.id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "super_admins_manage_channels"
  ON channels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for messages
CREATE POLICY "channel_members_view_messages"
  ON messages FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "channel_members_send_messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_messages"
  ON messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_messages"
  ON messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "super_admins_manage_messages"
  ON messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RLS Policies for channel_members
CREATE POLICY "channel_members_view_members"
  ON channel_members FOR SELECT TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "channel_admins_manage_members"
  ON channel_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id 
      AND cm.user_id = auth.uid() 
      AND cm.role = 'admin'
    )
  );

CREATE POLICY "users_join_public_channels"
  ON channel_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND channel_id IN (
      SELECT c.id FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE up.id = auth.uid() AND c.type IN ('public', 'department')
    )
  );

CREATE POLICY "super_admins_manage_channel_members"
  ON channel_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Create triggers for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_departments_updated_at') THEN
    CREATE TRIGGER update_departments_updated_at
      BEFORE UPDATE ON departments FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shifts_updated_at') THEN
    CREATE TRIGGER update_shifts_updated_at
      BEFORE UPDATE ON shifts FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_incidents_updated_at') THEN
    CREATE TRIGGER update_incidents_updated_at
      BEFORE UPDATE ON incidents FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON tasks FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_announcements_updated_at') THEN
    CREATE TRIGGER update_announcements_updated_at
      BEFORE UPDATE ON announcements FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
    CREATE TRIGGER update_contacts_updated_at
      BEFORE UPDATE ON contacts FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create default departments and channels for existing enterprises
DO $$
DECLARE
  enterprise_record RECORD;
  dept_security uuid;
  dept_operations uuid;
  dept_maintenance uuid;
  dept_customer_service uuid;
  first_admin_id uuid;
BEGIN
  -- Get the first super admin to use as creator
  SELECT id INTO first_admin_id 
  FROM admin_profiles 
  WHERE role = 'super_admin' 
  LIMIT 1;
  
  -- If no super admin exists, skip setup
  IF first_admin_id IS NULL THEN
    RAISE NOTICE 'No super admin found, skipping default setup';
    RETURN;
  END IF;

  FOR enterprise_record IN SELECT * FROM enterprises WHERE status = 'active' LOOP
    -- Create default departments
    INSERT INTO departments (enterprise_id, name, code, description, color)
    VALUES 
      (enterprise_record.id, 'Security', 'SEC', 'Airport security and safety operations', '#DC2626'),
      (enterprise_record.id, 'Ground Operations', 'OPS', 'Ground handling and aircraft operations', '#2563EB'),
      (enterprise_record.id, 'Maintenance', 'MAINT', 'Equipment and facility maintenance', '#059669'),
      (enterprise_record.id, 'Customer Service', 'CS', 'Passenger services and assistance', '#7C3AED')
    ON CONFLICT (enterprise_id, code) DO NOTHING;

    -- Get department IDs
    SELECT id INTO dept_security FROM departments WHERE enterprise_id = enterprise_record.id AND code = 'SEC';
    SELECT id INTO dept_operations FROM departments WHERE enterprise_id = enterprise_record.id AND code = 'OPS';
    SELECT id INTO dept_maintenance FROM departments WHERE enterprise_id = enterprise_record.id AND code = 'MAINT';
    SELECT id INTO dept_customer_service FROM departments WHERE enterprise_id = enterprise_record.id AND code = 'CS';

    -- Create default channels (WhatsApp-style with Flights channel)
    INSERT INTO channels (enterprise_id, name, description, type, created_by, department_id)
    VALUES 
      (enterprise_record.id, 'general', 'General discussion for all staff', 'public', first_admin_id, NULL),
      (enterprise_record.id, 'announcements', 'Important announcements and updates', 'public', first_admin_id, NULL),
      (enterprise_record.id, 'flights', 'Flight operations and coordination', 'public', first_admin_id, dept_operations),
      (enterprise_record.id, 'security-ops', 'Security operations coordination', 'department', first_admin_id, dept_security),
      (enterprise_record.id, 'ground-ops', 'Ground operations coordination', 'department', first_admin_id, dept_operations),
      (enterprise_record.id, 'maintenance', 'Maintenance requests and updates', 'department', first_admin_id, dept_maintenance),
      (enterprise_record.id, 'customer-service', 'Customer service coordination', 'department', first_admin_id, dept_customer_service),
      (enterprise_record.id, 'incidents', 'Incident reporting and response', 'public', first_admin_id, NULL),
      (enterprise_record.id, 'shift-handovers', 'Shift change communications', 'public', first_admin_id, NULL)
    ON CONFLICT (enterprise_id, name) DO NOTHING;

    -- Add all users from this enterprise to public channels
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT c.id, up.id, 'member'
    FROM channels c
    CROSS JOIN user_profiles up
    WHERE c.enterprise_id = enterprise_record.id 
      AND up.enterprise_id = enterprise_record.id
      AND c.type = 'public'
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RAISE NOTICE 'Created default setup for enterprise: %', enterprise_record.name;
  END LOOP;
END $$;