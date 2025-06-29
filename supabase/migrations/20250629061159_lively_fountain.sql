/*
  # Fix infinite recursion in agents table RLS policy

  1. Policy Changes
    - Drop the existing INSERT policy that causes infinite recursion
    - Create a new INSERT policy that doesn't reference the agents table in the check condition
    - The agent count limit will be enforced in the application code instead

  2. Security
    - Maintain security by ensuring only verified users can create agent profiles
    - Ensure users can only create profiles for themselves
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Verified users can create agent profiles" ON agents;

-- Create a new INSERT policy without the recursive count check
CREATE POLICY "Verified users can create agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (uid() = user_id) AND 
    (EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = uid() AND profiles.is_verified = true
    ))
  );