/*
  # Add Deal Review and Rating System

  1. New Tables
    - `deal_reviews`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, foreign key to deals)
      - `reviewer_id` (uuid, foreign key to profiles - who wrote the review)
      - `reviewee_id` (uuid, foreign key to profiles - who is being reviewed)
      - `rating` (integer, 1-5 stars)
      - `review_text` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on deal_reviews table
    - Add policies for review management
    - Only participants of approved deals can review each other
    - Reviews are publicly viewable
*/

-- Create deal_reviews table
CREATE TABLE IF NOT EXISTS deal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, reviewer_id) -- Each user can only review once per deal
);

-- Enable RLS
ALTER TABLE deal_reviews ENABLE ROW LEVEL SECURITY;

-- Deal reviews policies
CREATE POLICY "Anyone can view deal reviews"
  ON deal_reviews
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Deal participants can create reviews for approved deals"
  ON deal_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_reviews.deal_id
      AND deals.status = 'approved'
      AND (deals.initiator_id = auth.uid() OR deals.recipient_id = auth.uid())
      AND (deals.initiator_id = deal_reviews.reviewee_id OR deals.recipient_id = deal_reviews.reviewee_id)
      AND deals.initiator_id != deals.recipient_id -- Prevent self-review
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON deal_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can delete their own reviews"
  ON deal_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_reviews_reviewee_id ON deal_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_deal_reviews_deal_id ON deal_reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_reviews_created_at ON deal_reviews(created_at DESC);