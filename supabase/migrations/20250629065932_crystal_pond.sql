/*
  # Remove Agent Verification System

  1. Schema Changes
    - Remove status column from agents table (no longer needed)
    - Remove admin_notes column from agents table (no longer needed)
    - Update existing agents to remove status references

  2. Policy Updates
    - Simplify agent policies since verification is no longer needed
    - Remove admin-specific agent management policies

  3. Data Cleanup
    - Remove any status-related data from existing agents
*/

-- Remove status and admin_notes columns from agents table
DO $$
BEGIN
  -- Remove status column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'status'
  ) THEN
    ALTER TABLE agents DROP COLUMN status;
  END IF;
  
  -- Remove admin_notes column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE agents DROP COLUMN admin_notes;
  END IF;
END $$;

-- Drop all existing agent policies to start fresh
DROP POLICY IF EXISTS "Public can view approved agents" ON agents;
DROP POLICY IF EXISTS "Users can view own agent profiles" ON agents;
DROP POLICY IF EXISTS "Admins can view all agent profiles" ON agents;
DROP POLICY IF EXISTS "Verified users can create agent profiles" ON agents;
DROP POLICY IF EXISTS "Users can update own agent profiles" ON agents;
DROP POLICY IF EXISTS "Admins can update all agent profiles" ON agents;
DROP POLICY IF EXISTS "Admins can delete agent profiles" ON agents;

-- Create simplified agent policies

-- Allow public to view all agents (no status filtering needed)
CREATE POLICY "Public can view all agents"
  ON agents
  FOR SELECT
  TO public
  USING (true);

-- Allow verified users to create agent profiles
CREATE POLICY "Verified users can create agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
    )
  );

-- Allow users to update their own agent profiles
CREATE POLICY "Users can update own agent profiles"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own agent profiles
CREATE POLICY "Users can delete own agent profiles"
  ON agents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to delete any agent profiles (for moderation)
CREATE POLICY "Admins can delete agent profiles"
  ON agents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );