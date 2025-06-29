/*
  # Fix infinite recursion in agents table RLS policies

  1. Problem
    - The current RLS policies on the agents table are causing infinite recursion
    - This happens when policies reference themselves or create circular dependencies

  2. Solution
    - Drop existing problematic policies
    - Create new, simplified policies that avoid circular references
    - Ensure policies are logically sound and don't reference themselves

  3. New Policies
    - Public can view approved agents (simple status check)
    - Users can view their own agent profiles (direct user_id comparison)
    - Admins can view all agent profiles (profile check without recursion)
    - Verified users can create agent profiles (with proper limits)
    - Users can update their own profiles
    - Admins can update all profiles
*/

-- Drop all existing policies on agents table to start fresh
DROP POLICY IF EXISTS "Anyone can view approved agents" ON agents;
DROP POLICY IF EXISTS "Users can view their own agent profile" ON agents;
DROP POLICY IF EXISTS "Admins can view all agent profiles" ON agents;
DROP POLICY IF EXISTS "Verified users can create up to 5 agent profiles" ON agents;
DROP POLICY IF EXISTS "Users can update their own agent profile" ON agents;
DROP POLICY IF EXISTS "Admins can update all agent profiles" ON agents;

-- Create new, non-recursive policies

-- Allow public to view approved agents (simple status check)
CREATE POLICY "Public can view approved agents"
  ON agents
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Allow users to view their own agent profiles
CREATE POLICY "Users can view own agent profiles"
  ON agents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to view all agent profiles
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

-- Allow verified users to create agent profiles (with limit check)
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
    AND (
      SELECT COUNT(*) FROM agents 
      WHERE agents.user_id = auth.uid()
    ) < 5
  );

-- Allow users to update their own agent profiles
CREATE POLICY "Users can update own agent profiles"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update all agent profiles
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

-- Allow admins to delete agent profiles
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