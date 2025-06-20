/*
  # Create Database Triggers for Push Notifications

  1. New Functions
    - `notify_new_message()` - Triggers when a new message is inserted
    - `notify_dm_message()` - Triggers when a DM conversation is updated

  2. Triggers
    - `on_message_created` - Calls Edge Function when new message is created
    - `on_dm_updated` - Calls Edge Function when DM conversation is updated

  3. Security
    - Functions run with SECURITY DEFINER to access Edge Functions
    - Only triggers on INSERT/UPDATE operations
*/

-- Function to notify about new group chat messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to send push notifications
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-new-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object('record', to_jsonb(NEW))
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify about new DM messages
CREATE OR REPLACE FUNCTION notify_dm_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if messages array has been updated (new message added)
  IF OLD.messages IS DISTINCT FROM NEW.messages THEN
    -- Call the Edge Function to send push notifications
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notify-dm-message',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object('record', to_jsonb(NEW))
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new group chat messages
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Create trigger for DM updates
DROP TRIGGER IF EXISTS on_dm_updated ON dms;
CREATE TRIGGER on_dm_updated
  AFTER UPDATE ON dms
  FOR EACH ROW
  EXECUTE FUNCTION notify_dm_message();