import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type PageType = 'group-chat' | 'dms' | 'profile';

interface DMNotification {
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  created_at: string;
}

export function useDMNotifications(
  currentUserId: string | null,
  currentPage: PageType,
  activeConversationId: string | null,
) {
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<DMNotification | null>(null);

  // Fetch initial conversations to determine unread status
  useEffect(() => {
    if (!currentUserId) return;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from('dms')
        .select('id, messages')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

      const newUnread = new Set<string>();
      (data || []).forEach((conv: any) => {
        const messages = conv.messages as any[];
        if (!messages || messages.length === 0) return;
        const last = messages[messages.length - 1];
        const lastRead = localStorage.getItem(`dm_last_read_${conv.id}`);
        if (!lastRead || new Date(last.created_at) > new Date(lastRead)) {
          newUnread.add(conv.id);
        }
      });
      setUnreadConversations(newUnread);
    };

    fetchInitial();
  }, [currentUserId]);

  // Subscribe to DM updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('dm_notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dms' }, payload => {
        const conv = payload.new as any;
        if (conv.user1_id !== currentUserId && conv.user2_id !== currentUserId) return;
        const messages = conv.messages as any[];
        if (!messages || messages.length === 0) return;
        const last = messages[messages.length - 1];
        if (last.sender_id === currentUserId) return; // ignore own messages

        const key = `dm_last_read_${conv.id}`;
        const lastRead = localStorage.getItem(key);
        const isUnread = !lastRead || new Date(last.created_at) > new Date(lastRead);

        if (currentPage === 'dms' && activeConversationId === conv.id) {
          // If viewing the conversation, mark as read
          localStorage.setItem(key, last.created_at);
          setUnreadConversations(prev => {
            const ns = new Set(prev);
            ns.delete(conv.id);
            return ns;
          });
        } else if (isUnread) {
          setUnreadConversations(prev => new Set(prev).add(conv.id));
          const senderUsername = last.sender_id === conv.user1_id ? conv.user1_username : conv.user2_username;
          setBanner({
            conversationId: conv.id,
            senderId: last.sender_id,
            senderUsername,
            content: last.content,
            created_at: last.created_at,
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, currentPage, activeConversationId]);

  const markAsRead = (conversationId: string, timestamp: string) => {
    localStorage.setItem(`dm_last_read_${conversationId}`, timestamp);
    setUnreadConversations(prev => {
      const ns = new Set(prev);
      ns.delete(conversationId);
      return ns;
    });
  };

  const clearBanner = () => setBanner(null);

  return {
    unreadConversations: Array.from(unreadConversations),
    banner,
    clearBanner,
    markAsRead,
  };
}

