/*
  # Fix Enterprise Domains and Session Management

  1. Remove whitelisted_domains table (not needed)
  2. Use domains array in enterprises table as originally designed
  3. Update functions to work with domains array
  4. Clean up any references to whitelisted_domains

  This follows the original design where enterprises.domains contains the whitelisted domains.
*/

-- Drop whitelisted_domains table if it exists
DROP TABLE IF EXISTS whitelisted_domains CASCADE;

-- Ensure enterprises table has domains array (should already exist)
-- This is just to make sure the column exists and has proper constraints
DO $$
BEGIN
  -- Check if domains column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enterprises' AND column_name = 'domains'
  ) THEN
    ALTER TABLE enterprises ADD COLUMN domains text[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;

-- Update the check_domain_whitelist function to use enterprises.domains array
CREATE OR REPLACE FUNCTION check_domain_whitelist(email_address text)
RETURNS TABLE(enterprise_id uuid, enterprise_name text) AS $$
DECLARE
  domain_part text;
BEGIN
  -- Extract domain from email
  domain_part := '@' || split_part(email_address, '@', 2);
  
  -- Find enterprise with this domain in their domains array
  RETURN QUERY
  SELECT e.id, e.name
  FROM enterprises e
  WHERE lower(domain_part) = ANY(e.domains)
  AND e.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_domain_whitelist(text) TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed enterprise domains system:';
  RAISE NOTICE '  - Removed whitelisted_domains table';
  RAISE NOTICE '  - Using enterprises.domains array as designed';
  RAISE NOTICE '  - Updated check_domain_whitelist function';
  RAISE NOTICE '🚀 System now uses domains array correctly!';
END $$;