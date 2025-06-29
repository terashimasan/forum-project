/*
  # Add Admin Request System

  1. New Tables
    - `admin_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (text)
      - `status` (text: pending, approved, rejected)
      - `admin_notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on admin_requests table
    - Add policies for admin requests
*/

-- Create admin_requests table
CREATE TABLE IF NOT EXISTS admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;

-- Admin requests policies
CREATE POLICY "Users can view their own admin requests"
  ON admin_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own admin requests"
  ON admin_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view all admin requests"
  ON admin_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_owner = true
    )
  );

CREATE POLICY "Owners can update admin requests"
  ON admin_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_owner = true
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_admin_requests_updated_at
  BEFORE UPDATE ON admin_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();