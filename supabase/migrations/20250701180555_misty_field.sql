/*
  # Complete Enterprise Management System

  1. New Tables
    - `enterprises` - Main table with domains array, contact info, and status
    - `user_profiles` - Regular users linked to enterprises
    - Updates `admin_profiles` - Adds enterprise_id for enterprise admins

  2. Optimized Design
    - Domains stored as array in enterprises table (no separate table needed)
    - Fast GIN indexes for domain searches and text search
    - Proper constraints for data validation
    - Foreign key relationships properly established

  3. Security
    - RLS policies for all user types (super admins, enterprise admins, users)
    - Proper permissions granted to authenticated users
    - Secure functions for domain management

  4. Performance Features
    - GIN indexes for fast domain and text searches
    - Standard indexes for foreign keys and status
    - Automatic timestamp triggers for updated_at fields
*/

-- Create domain validation function first
CREATE OR REPLACE FUNCTION validate_domain_format(domain_array text[])
RETURNS boolean AS $$
DECLARE
  domain text;
BEGIN
  -- If array is empty or null, it's valid
  IF domain_array IS NULL OR array_length(domain_array, 1) IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check each domain in the array
  FOREACH domain IN ARRAY domain_array
  LOOP
    IF domain !~ '^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create enterprises table
CREATE TABLE IF NOT EXISTS enterprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text NOT NULL,
  domains text[] DEFAULT '{}' NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints for enterprises
ALTER TABLE enterprises ADD CONSTRAINT enterprises_status_check 
  CHECK (status IN ('active', 'archived'));

-- Add constraint to ensure domains are properly formatted using our function
ALTER TABLE enterprises 
ADD CONSTRAINT enterprises_domains_format_check 
CHECK (validate_domain_format(domains));

-- Create user_profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints for user_profiles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_status_check 
  CHECK (status IN ('active', 'suspended'));

-- Add enterprise_id to admin_profiles table (for enterprise admins)
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS enterprise_id uuid REFERENCES enterprises(id) ON DELETE SET NULL;

-- Update the constraint for admin_profiles to handle enterprise_id properly
ALTER TABLE admin_profiles DROP CONSTRAINT IF EXISTS admin_profiles_enterprise_check;
ALTER TABLE admin_profiles ADD CONSTRAINT admin_profiles_enterprise_check 
  CHECK (
    (role = 'super_admin' AND enterprise_id IS NULL) OR 
    (role = 'admin' AND enterprise_id IS NOT NULL)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enterprises_domains_gin ON enterprises USING gin(domains);
CREATE INDEX IF NOT EXISTS idx_enterprises_name_text ON enterprises USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_enterprises_status ON enterprises(status);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_enterprise_id ON admin_profiles(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_enterprise_id ON user_profiles(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable RLS on enterprises table
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_profiles table (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enterprises table
CREATE POLICY "super_admins_full_access_enterprises"
  ON enterprises
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid() 
      AND admin_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid() 
      AND admin_profiles.role = 'super_admin'
    )
  );

-- Enterprise admins can view their own enterprise
CREATE POLICY "enterprise_admins_view_own_enterprise"
  ON enterprises
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT enterprise_id FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.role = 'admin'
      AND admin_profiles.enterprise_id IS NOT NULL
    )
  );

-- Users can view their enterprise
CREATE POLICY "users_view_own_enterprise"
  ON enterprises
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT enterprise_id FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
    )
  );

-- RLS Policies for user_profiles table (if not already created)
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;

-- Users can read their own profile
CREATE POLICY "users_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "users_can_insert_own_profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can manage all user profiles
CREATE POLICY "super_admins_manage_user_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid() 
      AND admin_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid() 
      AND admin_profiles.role = 'super_admin'
    )
  );

-- Enterprise admins can view users in their enterprise
CREATE POLICY "enterprise_admins_view_enterprise_users"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM admin_profiles 
      WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.role = 'admin'
      AND admin_profiles.enterprise_id IS NOT NULL
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprises TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- Add helpful functions for domain management
CREATE OR REPLACE FUNCTION add_domain_to_enterprise(enterprise_id uuid, new_domain text)
RETURNS void AS $$
BEGIN
  -- Validate domain format
  IF new_domain !~ '^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid domain format. Domain must start with @ and be a valid domain (e.g., @company.com)';
  END IF;
  
  -- Add domain if not already exists
  UPDATE enterprises 
  SET domains = array_append(domains, lower(new_domain)),
      updated_at = now()
  WHERE id = enterprise_id 
  AND NOT (lower(new_domain) = ANY(domains));
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enterprise not found or domain already exists';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_domain_from_enterprise(enterprise_id uuid, domain_to_remove text)
RETURNS void AS $$
BEGIN
  UPDATE enterprises 
  SET domains = array_remove(domains, lower(domain_to_remove)),
      updated_at = now()
  WHERE id = enterprise_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enterprise not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_domain_whitelist(email_address text)
RETURNS TABLE(enterprise_id uuid, enterprise_name text) AS $$
DECLARE
  domain_part text;
BEGIN
  -- Extract domain from email
  domain_part := '@' || split_part(email_address, '@', 2);
  
  -- Find enterprise with this domain
  RETURN QUERY
  SELECT e.id, e.name
  FROM enterprises e
  WHERE lower(domain_part) = ANY(e.domains)
  AND e.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_domain_format(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION add_domain_to_enterprise(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_domain_from_enterprise(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_domain_whitelist(text) TO authenticated;

-- Add trigger function for updating updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at timestamp
DO $$
BEGIN
    -- Trigger for enterprises table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_enterprises_updated_at'
    ) THEN
        CREATE TRIGGER update_enterprises_updated_at
            BEFORE UPDATE ON enterprises
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger for user_profiles table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Complete Enterprise Management System created:';
  RAISE NOTICE '  - Created enterprises table with domains array';
  RAISE NOTICE '  - Created user_profiles table';
  RAISE NOTICE '  - Added enterprise_id to admin_profiles';
  RAISE NOTICE '  - Created optimized indexes for performance';
  RAISE NOTICE '  - Added domain management functions';
  RAISE NOTICE '  - Set up comprehensive RLS policies';
  RAISE NOTICE '  - Added automatic timestamp triggers';
  RAISE NOTICE '🚀 System ready for enterprise management!';
END $$;