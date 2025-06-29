/*
  # Add User Ban System

  1. New Columns
    - `is_banned` (boolean, default false) - Track if user is banned

  2. Security
    - Update policies to prevent banned users from creating content
    - Allow admins to manage ban status
*/

-- Add is_banned column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;
END $$;

-- Update existing policies to prevent banned users from creating content

-- Update threads policies
DROP POLICY IF EXISTS "Authenticated users can create threads" ON threads;
CREATE POLICY "Non-banned users can create threads"
  ON threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_banned = false OR profiles.is_banned IS NULL)
    )
  );

-- Update posts policies
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Non-banned users can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_banned = false OR profiles.is_banned IS NULL)
    )
  );

-- Update deals policies
DROP POLICY IF EXISTS "Users can create deals" ON deals;
CREATE POLICY "Non-banned users can create deals"
  ON deals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = initiator_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_banned = false OR profiles.is_banned IS NULL)
    )
  );

-- Update agent creation policy
DROP POLICY IF EXISTS "Verified users can create agent profiles" ON agents;
CREATE POLICY "Verified non-banned users can create agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
      AND (profiles.is_banned = false OR profiles.is_banned IS NULL)
    )
  );