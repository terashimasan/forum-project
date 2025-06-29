/*
  # Update Agent System for Multiple Agents

  1. Changes
    - Remove unique constraint on user_id to allow multiple agents per user
    - Set default status to 'approved' (no admin approval needed)
    - Update policies to handle multiple agents

  2. Security
    - Update RLS policies for multiple agents
    - Maintain proper access controls
*/

-- Drop the unique constraint on user_id
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_user_id_key;

-- Update default status to approved (no admin approval needed)
ALTER TABLE agents ALTER COLUMN status SET DEFAULT 'approved';

-- Update existing pending agents to approved
UPDATE agents SET status = 'approved' WHERE status = 'pending';

-- Drop existing policies
DROP POLICY IF EXISTS "Verified users can create agent profiles" ON agents;

-- Create new policy for multiple agents (limit 5 per user)
CREATE POLICY "Verified users can create up to 5 agent profiles"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
    ) AND
    (
      SELECT COUNT(*) FROM agents 
      WHERE agents.user_id = auth.uid()
    ) < 5
  );