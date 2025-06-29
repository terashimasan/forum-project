/*
  # Fix Agents Table RLS Policy Infinite Recursion

  1. Problem
    - The existing INSERT policy for agents table has infinite recursion
    - Policy checks agents table count while inserting into agents table
    - This causes "infinite recursion detected in policy" error

  2. Solution
    - Drop the problematic INSERT policy
    - Create new policy without recursive count check
    - Use auth.uid() instead of uid() function
    - Keep verification check and user ownership check

  3. Security
    - Only authenticated users can create agent profiles
    - Users can only create profiles for themselves
    - Only verified users can create agent profiles
*/

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Verified users can create agent profiles" ON agents;

-- Create a new INSERT policy without the recursive count check
CREATE POLICY "Verified users can create agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) AND 
    (EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_verified = true
    ))
  );