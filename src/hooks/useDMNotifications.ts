import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { DMConversation, DMMessage } from '../types/dm';

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch initial conversations to determine unread status
  useEffect(() => {
    if (!currentUserId || hasInitialized) return;

    const fetchInitial = async () => {
      try {
        const { data } = await supabase
          .from('dms')
          .select('id, user1_id, user2_id, user1_username, user2_username, messages')
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .order('updated_at', { ascending: false });

        const newUnread = new Set<string>();
        (data || []).forEach((conv: DMConversation) => {
          const messages = conv.messages as DMMessage[];
          if (!messages || messages.length === 0) return;
          const last = messages[messages.length - 1];
          
          // Skip if the last message is from the current user
          if (last.sender_id === currentUserId) return;
          
          const lastRead = localStorage.getItem(`dm_last_read_${conv.id}`);
          if (!lastRead || new Date(last.created_at) > new Date(lastRead)) {
            newUnread.add(conv.id);
          }
        });
        setUnreadConversations(newUnread);
        setHasInitialized(true);
      } catch (error) {
        console.error('Error fetching initial DM conversations:', error);
        setHasInitialized(true);
      }
    };

    fetchInitial();
  }, [currentUserId, hasInitialized]);

  // Subscribe to DM updates
  useEffect(() => {
    if (!currentUserId || !hasInitialized) return;

    // Clean up any existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase
      .channel('dm_notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dms' }, payload => {
        const conv = payload.new as DMConversation;
        
        // Only process conversations involving the current user
        if (conv.user1_id !== currentUserId && conv.user2_id !== currentUserId) return;
        
        const messages = conv.messages as DMMessage[];
        if (!messages || messages.length === 0) return;
        
        const last = messages[messages.length - 1];
        
        // Ignore messages sent by the current user
        if (last.sender_id === currentUserId) return;

        const key = `dm_last_read_${conv.id}`;
        const lastRead = localStorage.getItem(key);
        const isUnread = !lastRead || new Date(last.created_at) > new Date(lastRead);

        // If currently viewing this specific conversation, mark as read immediately
        if (currentPage === 'dms' && activeConversationId === conv.id) {
          localStorage.setItem(key, last.created_at);
          setUnreadConversations(prev => {
            const ns = new Set(prev);
            ns.delete(conv.id);
            return ns;
          });
        } else if (isUnread) {
          // Add to unread and show banner notification
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

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [currentUserId, currentPage, activeConversationId, hasInitialized]);

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

