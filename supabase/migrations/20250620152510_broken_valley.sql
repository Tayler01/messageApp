/*
  # Create function to cleanup old messages

  1. New Functions
    - `cleanup_old_messages()` - Deletes messages when count exceeds 100, keeping only the 100 most recent
    - Can be called manually or triggered automatically

  2. Usage
    - Keeps only the 100 most recent messages
    - Deletes older messages to maintain performance
    - Can be scheduled to run periodically

  3. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
    - Only affects the messages table
*/

-- Function to cleanup old messages, keeping only the 100 most recent
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
DECLARE
  message_count integer;
BEGIN
  -- Get current message count
  SELECT COUNT(*) INTO message_count FROM messages;
  
  -- Only cleanup if we have more than 100 messages
  IF message_count > 100 THEN
    -- Delete all but the 100 most recent messages
    DELETE FROM messages 
    WHERE id NOT IN (
      SELECT id 
      FROM messages 
      ORDER BY created_at DESC 
      LIMIT 100
    );
    
    -- Log the cleanup (optional)
    RAISE NOTICE 'Cleaned up % old messages, kept 100 most recent', (message_count - 100);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a trigger to automatically cleanup after each insert
-- Uncomment the lines below if you want automatic cleanup on every new message
-- Note: This might impact performance on high-traffic applications

/*
CREATE OR REPLACE FUNCTION trigger_cleanup_old_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run cleanup occasionally to avoid performance issues
  -- This runs cleanup roughly 1% of the time
  IF random() < 0.01 THEN
    PERFORM cleanup_old_messages();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_cleanup_messages
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_old_messages();
*/