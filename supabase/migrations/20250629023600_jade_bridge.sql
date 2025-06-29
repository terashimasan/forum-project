/*
  # Add Review Assessment System

  1. New Tables
    - `review_assessments`
      - `id` (uuid, primary key)
      - `review_id` (uuid, foreign key to deal_reviews)
      - `user_id` (uuid, foreign key to profiles - the reviewer requesting assessment)
      - `reason` (text, optional - why they want it assessed)
      - `status` (text: pending, approved, rejected)
      - `admin_notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on review_assessments table
    - Add policies for assessment management
    - Only reviewers can request assessment of their own reviews
    - Only admins can view and manage assessments
*/

-- Create review_assessments table
CREATE TABLE IF NOT EXISTS review_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES deal_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(review_id) -- Each review can only have one assessment request
);

-- Enable RLS
ALTER TABLE review_assessments ENABLE ROW LEVEL SECURITY;

-- Review assessments policies
CREATE POLICY "Users can view their own review assessments"
  ON review_assessments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create assessments for their own reviews"
  ON review_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM deal_reviews
      WHERE deal_reviews.id = review_assessments.review_id
      AND deal_reviews.reviewer_id = auth.uid()
      AND deal_reviews.rating BETWEEN 1 AND 4 -- Only 1-4 star reviews can be assessed
    )
  );

CREATE POLICY "Admins can view all review assessments"
  ON review_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

CREATE POLICY "Admins can update review assessments"
  ON review_assessments
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
CREATE TRIGGER update_review_assessments_updated_at
  BEFORE UPDATE ON review_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_assessments_review_id ON review_assessments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_assessments_user_id ON review_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_assessments_status ON review_assessments(status);