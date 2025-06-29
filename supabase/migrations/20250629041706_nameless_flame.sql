/*
  # Add Deal Type Field

  1. New Columns
    - `deal_type` (text) - Type of deal: hire agent, transaction, other

  2. Changes
    - Add deal_type column to deals table with default value
    - Add check constraint for valid deal types
*/

-- Add deal_type column to deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'deal_type'
  ) THEN
    ALTER TABLE deals ADD COLUMN deal_type text DEFAULT 'other' CHECK (deal_type IN ('hire_agent', 'transaction', 'other'));
  END IF;
END $$;