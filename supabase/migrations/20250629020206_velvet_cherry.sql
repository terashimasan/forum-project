/*
  # Add Edit Tracking for Threads and Posts

  1. New Columns
    - `is_edited` (boolean, default false) - Track if content was edited
    - `edited_at` (timestamp, nullable) - When content was last edited
    - `edit_count` (integer, default 0) - Number of times edited

  2. Changes
    - Add edit tracking columns to threads and posts tables
    - Create function to update edit tracking on content changes
*/

-- Add edit tracking columns to threads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'threads' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE threads ADD COLUMN is_edited boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'threads' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE threads ADD COLUMN edited_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'threads' AND column_name = 'edit_count'
  ) THEN
    ALTER TABLE threads ADD COLUMN edit_count integer DEFAULT 0;
  END IF;
END $$;

-- Add edit tracking columns to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'is_edited'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_edited boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE posts ADD COLUMN edited_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'edit_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN edit_count integer DEFAULT 0;
  END IF;
END $$;

-- Function to track edits on threads
CREATE OR REPLACE FUNCTION track_thread_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only track if title or content changed
  IF OLD.title != NEW.title OR OLD.content != NEW.content THEN
    NEW.is_edited = true;
    NEW.edited_at = now();
    NEW.edit_count = COALESCE(OLD.edit_count, 0) + 1;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Function to track edits on posts
CREATE OR REPLACE FUNCTION track_post_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only track if content changed
  IF OLD.content != NEW.content THEN
    NEW.is_edited = true;
    NEW.edited_at = now();
    NEW.edit_count = COALESCE(OLD.edit_count, 0) + 1;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for edit tracking
DROP TRIGGER IF EXISTS track_thread_edit_trigger ON threads;
CREATE TRIGGER track_thread_edit_trigger
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION track_thread_edit();

DROP TRIGGER IF EXISTS track_post_edit_trigger ON posts;
CREATE TRIGGER track_post_edit_trigger
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION track_post_edit();

-- Add delete policies for threads
CREATE POLICY "Authors can delete their threads"
  ON threads FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any thread"
  ON threads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_owner = true)
    )
  );

-- Add delete policies for posts
CREATE POLICY "Authors can delete their posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any post"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_owner = true)
    )
  );