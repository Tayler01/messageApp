import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/message';

const PAGE_SIZE = 20;

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const oldestTimestampRef = useRef<string | null>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

          setMessages((prev) =>
            prev.some((msg) => msg.id === newMessage.id)
              ? prev
              : [...prev, newMessage]
          );
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

  useEffect(() => {
    // Start polling for new messages after a delay
    const timer = setTimeout(() => {
      const interval = setInterval(fetchNewMessages, 15000);
      return () => clearInterval(interval);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const fetchLatestMessages = async () => {
    try {
      console.log('Fetching latest messages...');
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      console.log('Messages query result:', { data, error });

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
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchOlderMessages = async () => {
    if (loadingOlder || !oldestTimestampRef.current || !hasMore) return;

    setLoadingOlder(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
        .lt('created_at', oldestTimestampRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newUnique = sorted.filter((m) => !existingIds.has(m.id));
        return [...newUnique, ...prev];
      });

      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching older messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const fetchNewMessages = async () => {
    if (!latestTimestampRef.current) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
        .gt('created_at', latestTimestampRef.current)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = data.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newUnique];
        });

        latestTimestampRef.current = data[data.length - 1].created_at;
      }
    } catch (err) {
      console.error('Failed to fetch new messages', err);
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
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          user_name: userName,
          user_id: userId,
          avatar_color: avatarColor,
          avatar_url: avatarUrl,
        })
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.some((msg) => msg.id === data.id) ? prev : [...prev, data]
        );
        if (
          !latestTimestampRef.current ||
          new Date(data.created_at) > new Date(latestTimestampRef.current)
        ) {
          latestTimestampRef.current = data.created_at;
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
  };
}


