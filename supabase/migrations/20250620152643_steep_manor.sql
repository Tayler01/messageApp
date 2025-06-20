-- Execute the cleanup function immediately
SELECT cleanup_old_messages();

-- Check how many messages remain after cleanup
SELECT COUNT(*) as remaining_messages FROM messages;

-- Show the 5 most recent messages to verify cleanup worked
SELECT 
  id,
  user_name,
  content,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 5;