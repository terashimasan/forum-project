/*
  # Create Forum Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `username` (text, unique)
      - `avatar_url` (text)
      - `bio` (text)
      - `post_count` (integer, default 0)
      - `reputation` (integer, default 0)
      - `is_verified` (boolean, default false)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `color` (text)
      - `created_at` (timestamp)
    
    - `threads`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `author_id` (uuid, references profiles)
      - `category_id` (uuid, references categories)
      - `is_pinned` (boolean, default false)
      - `is_locked` (boolean, default false)
      - `views` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `posts`
      - `id` (uuid, primary key)
      - `content` (text)
      - `author_id` (uuid, references profiles)
      - `thread_id` (uuid, references threads)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add admin-only policies where needed
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  post_count integer DEFAULT 0,
  reputation integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Categories policies
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Threads policies
CREATE POLICY "Anyone can view threads"
  ON threads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their threads"
  ON threads FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can update any thread"
  ON threads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Posts policies
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
  ('General Discussion', 'Talk about anything and everything', '#3b82f6'),
  ('Technology', 'Discuss the latest in tech', '#10b981'),
  ('Gaming', 'Share your gaming experiences', '#8b5cf6'),
  ('Help & Support', 'Get help from the community', '#f59e0b');

-- Function to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', 'User' || substr(new.id::text, 1, 8)));
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update post count
CREATE OR REPLACE FUNCTION update_post_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET post_count = post_count + 1,
        updated_at = now()
    WHERE id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET post_count = GREATEST(0, post_count - 1),
        updated_at = now()
    WHERE id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Triggers for post count
CREATE TRIGGER update_post_count_on_thread_insert
  AFTER INSERT ON threads
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

CREATE TRIGGER update_post_count_on_thread_delete
  AFTER DELETE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

CREATE TRIGGER update_post_count_on_post_insert
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();

CREATE TRIGGER update_post_count_on_post_delete
  AFTER DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_count();