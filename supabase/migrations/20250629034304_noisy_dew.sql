/*
  # Create Agent System

  1. New Tables
    - `agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `profile_picture` (text, image URL)
      - `height` (text)
      - `weight` (text)
      - `current_location` (text)
      - `services` (text array)
      - `pricing_short_time` (text)
      - `pricing_long_time` (text)
      - `pricing_overnight` (text)
      - `pricing_private` (text)
      - `description` (text)
      - `social_twitter` (text)
      - `social_instagram` (text)
      - `social_facebook` (text)
      - `social_telegram` (text)
      - `tags` (text array)
      - `status` (text: pending, approved, rejected)
      - `admin_notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on agents table
    - Add policies for agent management
    - Only verified users can create agent profiles
    - Admins can manage all agent profiles
*/

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_picture text,
  height text,
  weight text,
  current_location text,
  services text[] DEFAULT '{}',
  pricing_short_time text,
  pricing_long_time text,
  pricing_overnight text,
  pricing_private text,
  description text,
  social_twitter text,
  social_instagram text,
  social_facebook text,
  social_telegram text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id) -- Each user can only have one agent profile
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Agents policies
CREATE POLICY "Anyone can view approved agents"
  ON agents
  FOR SELECT
  TO public
  USING (status = 'approved');

CREATE POLICY "Verified users can create agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
    )
  );

CREATE POLICY "Users can view their own agent profile"
  ON agents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent profile"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all agent profiles"
  ON agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

CREATE POLICY "Admins can update all agent profiles"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_location ON agents(current_location);