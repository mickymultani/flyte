/*
  # Debug Functions for Profile Issues

  1. Create debug function to check profile data
  2. Create test enterprise for debugging
  3. Add helpful debug queries
*/

-- Create debug function to get profile info
CREATE OR REPLACE FUNCTION get_user_profile_debug(user_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}';
  user_profile_data jsonb;
  admin_profile_data jsonb;
  enterprise_data jsonb;
BEGIN
  -- Check user_profiles table
  SELECT to_jsonb(up.*) INTO user_profile_data
  FROM user_profiles up
  WHERE up.id = user_id;
  
  -- Check admin_profiles table
  SELECT to_jsonb(ap.*) INTO admin_profile_data
  FROM admin_profiles ap
  WHERE ap.id = user_id;
  
  -- Check if user has access to any enterprise
  SELECT to_jsonb(e.*) INTO enterprise_data
  FROM enterprises e
  WHERE e.id IN (
    SELECT up.enterprise_id FROM user_profiles up WHERE up.id = user_id
    UNION
    SELECT ap.enterprise_id FROM admin_profiles ap WHERE ap.id = user_id
  )
  LIMIT 1;
  
  -- Build result
  result := jsonb_build_object(
    'user_id', user_id,
    'user_profile', COALESCE(user_profile_data, 'null'::jsonb),
    'admin_profile', COALESCE(admin_profile_data, 'null'::jsonb),
    'enterprise', COALESCE(enterprise_data, 'null'::jsonb),
    'auth_uid', auth.uid(),
    'current_user', current_user,
    'session_user', session_user
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_profile_debug(uuid) TO authenticated;

-- Create a test enterprise if none exists
INSERT INTO enterprises (id, name, contact_email, domains, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Enterprise',
  'test@example.com',
  ARRAY['@test.com', '@example.com'],
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create test departments for the test enterprise
INSERT INTO departments (enterprise_id, name, code, description, color)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Test Department', 'TEST', 'Test department for debugging', '#3B82F6')
ON CONFLICT (enterprise_id, code) DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Debug functions created:';
  RAISE NOTICE '  - get_user_profile_debug() function';
  RAISE NOTICE '  - Test enterprise created';
  RAISE NOTICE '🔍 Use SELECT get_user_profile_debug(''your-user-id'') to debug';
END $$;