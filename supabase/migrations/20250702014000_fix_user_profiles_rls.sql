/*
  # Fix User Profiles RLS Infinite Recursion
  
  The user_profiles table is causing infinite recursion when policies reference themselves.
  This migration creates simple, non-recursive policies for user_profiles access.
*/

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_view_enterprise" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_create_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "super_admins_manage_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_authenticated_view" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_delete" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_authenticated_view"
  ON user_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_profiles_own_insert"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_own_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_profiles_own_delete"
  ON user_profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ User Profiles RLS policies fixed:';
  RAISE NOTICE '  - Removed all recursive policies';
  RAISE NOTICE '  - Simple authenticated view policy for contact search';
  RAISE NOTICE '  - Own profile management policies';
  RAISE NOTICE '🔍 Contact search should work now';
END $$;
