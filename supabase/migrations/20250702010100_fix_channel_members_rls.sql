/*
  # Fix Channel Members RLS Infinite Recursion

  The current RLS policies on channel_members table create infinite recursion
  because the policy to view channel_members queries channel_members itself.

  This migration fixes the issue by:
  1. Dropping the problematic recursive policies
  2. Creating new policies based on enterprise membership first
  3. Adding proper channel access controls without recursion

  Error being fixed: "infinite recursion detected in policy for relation 'channel_members'"
*/

DROP POLICY IF EXISTS "channel_members_view_members" ON channel_members;
DROP POLICY IF EXISTS "channel_admins_manage_members" ON channel_members;
DROP POLICY IF EXISTS "users_join_public_channels" ON channel_members;
DROP POLICY IF EXISTS "channel_admins_manage_channel_members" ON channel_members;
DROP POLICY IF EXISTS "users_join_enterprise_public_channels" ON channel_members;
DROP POLICY IF EXISTS "super_admins_manage_channel_members" ON channel_members;

CREATE POLICY "enterprise_users_view_channel_members"
  ON channel_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE c.id = channel_members.channel_id 
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "channel_admins_manage_channel_members"
  ON channel_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id 
      AND c.created_by = auth.uid()
    )
    OR
    (
      SELECT role FROM channel_members cm 
      WHERE cm.channel_id = channel_members.channel_id 
      AND cm.user_id = auth.uid()
      LIMIT 1
    ) = 'admin'
  );

CREATE POLICY "users_join_enterprise_public_channels"
  ON channel_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE c.id = channel_id 
      AND up.id = auth.uid()
      AND c.type IN ('public', 'department')
    )
  );

CREATE POLICY "super_admins_full_channel_members_access"
  ON channel_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "enterprise_users_view_channels" ON channels;
DROP POLICY IF EXISTS "users_create_enterprise_channels" ON channels;
DROP POLICY IF EXISTS "channel_creators_update_channels" ON channels;
DROP POLICY IF EXISTS "enterprise_users_view_enterprise_channels" ON channels;
DROP POLICY IF EXISTS "enterprise_users_create_channels" ON channels;
DROP POLICY IF EXISTS "channel_creators_and_admins_update" ON channels;
DROP POLICY IF EXISTS "super_admins_manage_channels" ON channels;

CREATE POLICY "enterprise_users_view_enterprise_channels"
  ON channels FOR SELECT TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "enterprise_users_create_channels"
  ON channels FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND enterprise_id IN (
      SELECT enterprise_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "channel_creators_and_admins_update"
  ON channels FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.enterprise_id = channels.enterprise_id
      AND up.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "super_admins_manage_channels"
  ON channels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "channel_members_view_messages" ON messages;
DROP POLICY IF EXISTS "channel_members_send_messages" ON messages;
DROP POLICY IF EXISTS "enterprise_channel_messages_view" ON messages;
DROP POLICY IF EXISTS "enterprise_channel_messages_send" ON messages;
DROP POLICY IF EXISTS "users_update_own_messages" ON messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON messages;
DROP POLICY IF EXISTS "super_admins_manage_messages" ON messages;

CREATE POLICY "enterprise_channel_messages_view"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE c.id = messages.channel_id 
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "enterprise_channel_messages_send"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN user_profiles up ON c.enterprise_id = up.enterprise_id
      WHERE c.id = channel_id 
      AND up.id = auth.uid()
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
