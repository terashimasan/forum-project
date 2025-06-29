/*
  # Add Honorable Title Feature

  1. New Columns
    - `honorable_title` (text, nullable) - Special title assigned by admins
  
  2. Changes
    - Add honorable_title column to profiles table
    - Allow admins to manage this field
*/

-- Add honorable_title column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'honorable_title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN honorable_title text;
  END IF;
END $$;