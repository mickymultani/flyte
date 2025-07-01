/*
  # Phase 1: Super Admin Authentication Setup

  1. New Tables
    - `admin_profiles` - For super admin accounts only
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text, unique)
      - `role` (text, 'super_admin' only for now)
      - `status` ('active' | 'suspended')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on admin_profiles table
    - Simple policies for admins to manage their own profiles
    - Grant necessary permissions

  3. Constraints
    - Role must be 'super_admin'
    - Status must be 'active' or 'suspended'
    - Email must be unique
*/

-- Create admin_profiles table for super admins
CREATE TABLE admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'super_admin',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE admin_profiles ADD CONSTRAINT admin_profiles_role_check 
  CHECK (role = 'super_admin');

ALTER TABLE admin_profiles ADD CONSTRAINT admin_profiles_status_check 
  CHECK (status IN ('active', 'suspended'));

-- Create indexes for better performance
CREATE INDEX idx_admin_profiles_email ON admin_profiles(email);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Simple and clean for Phase 1
-- Admins can insert their own profile (for registration)
CREATE POLICY "admins_can_insert_own_profile"
  ON admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins can read their own profile
CREATE POLICY "admins_can_read_own_profile"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can update their own profile
CREATE POLICY "admins_can_update_own_profile"
  ON admin_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON admin_profiles TO authenticated;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_profiles_updated_at 
  BEFORE UPDATE ON admin_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();