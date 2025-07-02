/*
  # Comprehensive RLS Policy Fix for Infinite Recursion

  This migration provides a complete fix for all RLS policies causing infinite recursion.
  It runs after all existing migrations to ensure no policies are overridden.

  Issues being fixed:
  - "infinite recursion detected in policy for relation 'channel_members'"
  - Channel visibility and membership management
  - Message access control

  Strategy: Use direct enterprise membership checks instead of recursive channel_members queries
*/

ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_members_view_members" ON channel_members;
DROP POLICY IF EXISTS "channel_admins_manage_members" ON channel_members;
DROP POLICY IF EXISTS "users_join_public_channels" ON channel_members;
DROP POLICY IF EXISTS "channel_admins_manage_channel_members" ON channel_members;
DROP POLICY IF EXISTS "users_join_enterprise_public_channels" ON channel_members;
DROP POLICY IF EXISTS "super_admins_manage_channel_members" ON channel_members;
DROP POLICY IF EXISTS "enterprise_users_view_channel_members" ON channel_members;
DROP POLICY IF EXISTS "super_admins_full_channel_members_access" ON channel_members;

DROP POLICY IF EXISTS "enterprise_users_view_channels" ON channels;
DROP POLICY IF EXISTS "users_create_enterprise_channels" ON channels;
DROP POLICY IF EXISTS "channel_creators_update_channels" ON channels;
DROP POLICY IF EXISTS "enterprise_users_view_enterprise_channels" ON channels;
DROP POLICY IF EXISTS "enterprise_users_create_channels" ON channels;
DROP POLICY IF EXISTS "channel_creators_and_admins_update" ON channels;
DROP POLICY IF EXISTS "super_admins_manage_channels" ON channels;

DROP POLICY IF EXISTS "channel_members_view_messages" ON messages;
DROP POLICY IF EXISTS "channel_members_send_messages" ON messages;
DROP POLICY IF EXISTS "enterprise_channel_messages_view" ON messages;
DROP POLICY IF EXISTS "enterprise_channel_messages_send" ON messages;
DROP POLICY IF EXISTS "users_update_own_messages" ON messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON messages;
DROP POLICY IF EXISTS "super_admins_manage_messages" ON messages;

ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_enterprise_access"
  ON channels FOR SELECT TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "channels_enterprise_create"
  ON channels FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "channels_creator_update"
  ON channels FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.enterprise_id = channels.enterprise_id
      AND up.role IN ('admin', 'supervisor')
    )
    OR EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid() 
      AND ap.enterprise_id = channels.enterprise_id
    )
  );

CREATE POLICY "channels_super_admin_access"
  ON channels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "channel_members_enterprise_view"
  ON channel_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id
      AND c.enterprise_id IN (
        SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "channel_members_join"
  ON channel_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.enterprise_id IN (
        SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
      )
      AND (c.type = 'public' OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "channel_members_creator_manage"
  ON channel_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "channel_members_super_admin_access"
  ON channel_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "messages_enterprise_view"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = messages.channel_id
      AND c.enterprise_id IN (
        SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_enterprise_send"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id
      AND c.enterprise_id IN (
        SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
        UNION
        SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_own_update"
  ON messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "messages_own_delete"
  ON messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "messages_super_admin_access"
  ON messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "enterprise_users_view_contacts" ON contacts;
DROP POLICY IF EXISTS "super_admins_manage_contacts" ON contacts;

CREATE POLICY "contacts_enterprise_view"
  ON contacts FOR SELECT TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_enterprise_create"
  ON contacts FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_enterprise_update"
  ON contacts FOR UPDATE TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
      UNION
      SELECT enterprise_id FROM admin_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "contacts_super_admin_access"
  ON contacts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Comprehensive RLS policies applied:';
  RAISE NOTICE '  - All recursive policies removed';
  RAISE NOTICE '  - Enterprise-based access control implemented';
  RAISE NOTICE '  - No more infinite recursion in channel_members';
  RAISE NOTICE '  - Contacts table RLS policies fixed';
  RAISE NOTICE '🔍 Test channel creation and contact addition now';
END $$;
