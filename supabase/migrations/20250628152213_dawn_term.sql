/*
  # Add verification system and owner functionality

  1. New Tables
    - `verification_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `images` (text array for image URLs)
      - `status` (text: pending, approved, rejected)
      - `admin_notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `site_settings`
      - `id` (uuid, primary key)
      - `site_title` (text)
      - `site_logo_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Profile Updates
    - Add `is_owner` field to profiles table

  3. Security
    - Enable RLS on new tables
    - Add policies for verification requests and site settings
*/

-- Add is_owner field to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_owner'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_owner boolean DEFAULT false;
  END IF;
END $$;

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text DEFAULT 'Elite Forum',
  site_logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default site settings if none exist
INSERT INTO site_settings (site_title, site_logo_url)
SELECT 'Elite Forum', null
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- Enable RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Verification requests policies
CREATE POLICY "Users can view their own verification requests"
  ON verification_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification requests"
  ON verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests"
  ON verification_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

CREATE POLICY "Admins can update verification requests"
  ON verification_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Site settings policies
CREATE POLICY "Anyone can view site settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only owners can update site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_owner = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();