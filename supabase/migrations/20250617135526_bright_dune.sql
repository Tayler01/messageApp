/*
  # Update messages table to reference users table

  1. Changes
    - Add foreign key constraint to link messages to users table
    - Update RLS policies to require authentication
    - Remove old policies and create new authenticated-only policies

  2. Security
    - Only authenticated users can read messages
    - Only authenticated users can insert messages
    - Users can only insert messages with their own user_id
*/

-- Update RLS policies for messages table
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;

-- Create new policies for authenticated users only
CREATE POLICY "Authenticated users can read messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Convert user_id column to uuid and add foreign key constraint
ALTER TABLE messages
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ALTER COLUMN user_id SET NOT NULL;

-- Link messages.user_id to users.id
ALTER TABLE messages
  ADD CONSTRAINT messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Index for quicker lookups by user
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
