/*
  # Add Deal Negotiation System

  1. New Tables
    - `deals`
      - `id` (uuid, primary key)
      - `initiator_id` (uuid, foreign key to profiles)
      - `recipient_id` (uuid, foreign key to profiles)
      - `title` (text)
      - `description` (text)
      - `initiator_images` (text array)
      - `status` (text: pending, negotiating, approved, rejected, cancelled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `deal_responses`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, foreign key to deals)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `images` (text array)
      - `response_type` (text: recipient_response, admin_approval)
      - `is_approved` (boolean, for recipient responses)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for deal management
*/

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  initiator_images text[] DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deal_responses table
CREATE TABLE IF NOT EXISTS deal_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  response_type text NOT NULL CHECK (response_type IN ('recipient_response', 'admin_approval')),
  is_approved boolean DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_responses ENABLE ROW LEVEL SECURITY;

-- Deals policies
CREATE POLICY "Users can view deals they are involved in"
  ON deals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create deals"
  ON deals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Deal participants can update deals"
  ON deals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Admins can view all deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

CREATE POLICY "Admins can update all deals"
  ON deals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Deal responses policies
CREATE POLICY "Users can view responses for their deals"
  ON deal_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_responses.deal_id
      AND (deals.initiator_id = auth.uid() OR deals.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can create responses for their deals"
  ON deal_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    (
      EXISTS (
        SELECT 1 FROM deals
        WHERE deals.id = deal_responses.deal_id
        AND (deals.initiator_id = auth.uid() OR deals.recipient_id = auth.uid())
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.is_admin = true OR profiles.is_owner = true)
      )
    )
  );

CREATE POLICY "Admins can view all deal responses"
  ON deal_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

CREATE POLICY "Admins can create deal responses"
  ON deal_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Create trigger for deals updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();