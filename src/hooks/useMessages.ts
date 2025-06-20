import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/message';

const PAGE_SIZE = 50;

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const oldestTimestampRef = useRef<string | null>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    console.log('useMessages: Starting to fetch messages...');
    fetchLatestMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            // Check if message already exists to prevent duplicates
            if (prev.some((msg) => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Update latest timestamp
          if (
            !latestTimestampRef.current ||
            new Date(newMessage.created_at) > new Date(latestTimestampRef.current)
          ) {
            latestTimestampRef.current = newMessage.created_at;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      console.log('useMessages: Cleaning up...');
      channel.unsubscribe();
    };
  }, []);

  const fetchLatestMessages = async () => {
    try {
      console.log('Fetching latest messages...');
      setLoading(true);
      setError(null);

      // First, test the connection
      console.log('Testing Supabase connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('messages')
        .select('count')
        .limit(1);
      
      console.log('Connection test:', { connectionTest, connectionError });
      
      if (connectionError) {
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, hearts_count, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      console.log('Messages query result:', { data, error });
      console.log('Raw data:', data);
      console.log('Data length:', data?.length);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();
      console.log('Setting messages:', sorted);
      setMessages(sorted);

      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
        latestTimestampRef.current = sorted[sorted.length - 1].created_at;
        console.log('Set timestamps:', {
          oldest: oldestTimestampRef.current,
          latest: latestTimestampRef.current
        });
      } else {
        console.log('No messages found in database');
      }

      setHasMore((data || []).length === PAGE_SIZE);
      isInitialLoadRef.current = false;
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchOlderMessages = async () => {
    if (loadingOlder || !oldestTimestampRef.current || !hasMore) {
      console.log('Skipping fetchOlderMessages:', { loadingOlder, oldest: oldestTimestampRef.current, hasMore });
      return;
    }

    console.log('Fetching older messages before:', oldestTimestampRef.current);
    setLoadingOlder(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, hearts_count, created_at')
        .lt('created_at', oldestTimestampRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();
      console.log('Fetched older messages:', sorted.length);

      if (sorted.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = sorted.filter((m) => !existingIds.has(m.id));
          console.log('Adding unique older messages:', newUnique.length);
          return [...newUnique, ...prev];
        });

        oldestTimestampRef.current = sorted[0].created_at;
        console.log('Updated oldest timestamp:', oldestTimestampRef.current);
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching older messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (
    content: string,
    userName: string,
    userId: string,
    avatarColor: string,
    avatarUrl?: string | null
  ) => {
    try {
      console.log('Sending message:', { content, userName, userId });
      
      // Validate that userId is a valid UUID
      if (!userId || userId === 'test-user-id') {
        throw new Error('Invalid user ID - user must be authenticated');
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          user_name: userName,
          user_id: userId,
          avatar_color: avatarColor,
          avatar_url: avatarUrl,
          hearts_count: 0,
        })
        .select('id, content, user_name, user_id, avatar_color, avatar_url, hearts_count, created_at')
        .single();

      if (error) throw error;

      console.log('Message sent successfully:', data);

      if (data) {
        // Optimistically add the message to local state in case realtime
        // updates are not received due to configuration issues
        setMessages(prev => [...prev, data]);

        if (!latestTimestampRef.current ||
            new Date(data.created_at) > new Date(latestTimestampRef.current)) {
          latestTimestampRef.current = data.created_at;
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err; // Re-throw so the UI can handle it
    }
  };

  const heartMessage = async (id: string, currentCount: number = 0) => {
    const newCount = currentCount + 1;
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, hearts_count: newCount } : m))
    );
    const { error } = await supabase
      .from('messages')
      .update({ hearts_count: newCount })
      .eq('id', id);
    if (error) {
      console.error('Failed to heart message:', error);
    }
  };

  return {
    messages,
    loading,
    loadingOlder,
    error,
    sendMessage,
    heartMessage,
    fetchOlderMessages,
    hasMore,
  };
}