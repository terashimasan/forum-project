/*
  # Fix Category Management Policies

  1. Policy Updates
    - Allow owners to manage categories (they should have same permissions as admins)
    - Fix category management policies to include owners

  2. New Features
    - Add sort_order column to categories for manual sorting
    - Add index for better performance
*/

-- Add sort_order column to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Update existing categories with sort order based on creation date
UPDATE categories 
SET sort_order = row_number() OVER (ORDER BY created_at)
WHERE sort_order = 0;

-- Drop existing category policies
DROP POLICY IF EXISTS "Only admins can manage categories" ON categories;

-- Create new policies that include owners
CREATE POLICY "Only admins and owners can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_owner = true)
    )
  );

-- Add index for sort_order
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);