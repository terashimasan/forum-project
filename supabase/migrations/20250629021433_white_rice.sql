/*
  # Fix Edit Policies - Only Authors Can Edit

  1. Policy Updates
    - Remove admin/owner edit permissions for threads and posts
    - Only allow authors to edit their own content
    - Keep admin/owner delete permissions

  2. Security
    - Ensure only content authors can modify their posts/threads
    - Maintain admin moderation capabilities for deletion
*/

-- Drop existing edit policies for threads
DROP POLICY IF EXISTS "Authors can update their threads" ON threads;
DROP POLICY IF EXISTS "Admins can update any thread" ON threads;

-- Drop existing edit policies for posts  
DROP POLICY IF EXISTS "Authors can update their posts" ON posts;

-- Create new restrictive edit policies for threads
CREATE POLICY "Authors can update their threads"
  ON threads FOR UPDATE
  USING (auth.uid() = author_id);

-- Create new restrictive edit policies for posts
CREATE POLICY "Authors can update their posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Keep admin delete policies but ensure they exist
DROP POLICY IF EXISTS "Admins can delete any thread" ON threads;
DROP POLICY IF EXISTS "Admins can delete any post" ON posts;

CREATE POLICY "Admins can delete any thread"
  ON threads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_owner = true)
    )
  );

CREATE POLICY "Admins can delete any post"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_admin = true OR is_owner = true)
    )
  );