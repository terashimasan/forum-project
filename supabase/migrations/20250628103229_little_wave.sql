/*
  # Grant Admin Privileges to New User

  1. Updates
    - Set the most recently created user as admin
    - This will be the user who just registered

  2. Security
    - Only affects the most recent user registration
    - Grants admin access to the admin panel
*/

-- Update the most recently created user to be an admin
UPDATE profiles 
SET is_admin = true 
WHERE id = (
  SELECT id 
  FROM profiles 
  ORDER BY created_at DESC 
  LIMIT 1
);