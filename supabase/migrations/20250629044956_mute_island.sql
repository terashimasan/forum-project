/*
  # Fix Category Management and Add Manual Sorting

  1. New Columns
    - `sort_order` (integer, default 0) - For manual category sorting

  2. Policy Updates
    - Allow owners to manage categories alongside admins

  3. Data Updates
    - Set initial sort order for existing categories
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

-- Update existing categories with sort order using a subquery approach
WITH ordered_categories AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as new_order
  FROM categories
  WHERE sort_order = 0
)
UPDATE categories 
SET sort_order = ordered_categories.new_order
FROM ordered_categories
WHERE categories.id = ordered_categories.id;

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