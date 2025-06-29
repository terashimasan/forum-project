/*
  # Fix Review Assessment System - For Reviewees Only

  1. Updates
    - Fix policies to allow reviewees (not reviewers) to assess reviews
    - Update constraints to ensure only reviewees can request assessments
    - Only 1-4 star reviews can be assessed

  2. Security
    - Update RLS policies for correct permissions
    - Ensure only the person being reviewed can request assessment
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create assessments for their own reviews" ON review_assessments;

-- Create correct policy for reviewees to assess reviews about them
CREATE POLICY "Users can create assessments for reviews about them"
  ON review_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM deal_reviews
      WHERE deal_reviews.id = review_assessments.review_id
      AND deal_reviews.reviewee_id = auth.uid() -- The person being reviewed can assess
      AND deal_reviews.rating BETWEEN 1 AND 4 -- Only 1-4 star reviews can be assessed
    )
  );