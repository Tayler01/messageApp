import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useLayoutEffect,
  useMemo,
} from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { DateDivider } from './DateDivider';
import { formatDateGroup } from '../utils/formatDateGroup';
import { Message } from '../types/message';
import {
  VirtualizedMessageList,
  VirtualizedMessageListHandle,
} from './VirtualizedMessageList';

interface ChatAreaProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  fetchOlderMessages: () => void;
  hasMore: boolean;
  onUserClick?: (userId: string) => void;
}

export function ChatArea({
  messages,
  currentUserId,
  loading,
  error,
  onRetry,
  fetchOlderMessages,
  hasMore,
  onUserClick,
}: ChatAreaProps) {
  console.log('ChatArea render:', { 
    messagesCount: messages.length, 
    loading, 
    error,
    currentUserId 
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualizedMessageListHandle>(null);
  const hasAutoScrolled = useRef(false);
  const isFetchingRef = useRef(false);
  const prevHeightRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const [listHeight, setListHeight] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setListHeight(container.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    // Auto-scroll on initial load or when near bottom
    if (!hasAutoScrolled.current || isNearBottom) {
      setTimeout(() => {
        listRef.current?.scrollToItem(messages.length - 1);
        if (!hasAutoScrolled.current) {
          hasAutoScrolled.current = true;
        }
      }, 100);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Handle scroll to load older messages
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (!container || !hasMore || isFetchingRef.current) return;

    // Check if scrolled to top
    if (container.scrollTop <= 100) {
      console.log('Scrolled to top, fetching older messages...');
      prevHeightRef.current = container.scrollHeight;
      isFetchingRef.current = true;
      fetchOlderMessages();
    }
  }, [fetchOlderMessages, hasMore]);

  // Maintain scroll position after loading older messages
  useLayoutEffect(() => {
    if (!isFetchingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const newHeight = container.scrollHeight;
      const heightDiff = newHeight - prevHeightRef.current;
      if (heightDiff > 0) {
        container.scrollTop = heightDiff;
      }
      isFetchingRef.current = false;
    });
  }, [messages.length]);

  // Prepare items for virtualized list
  const items = useMemo(() => {
    const arr: { key: string; element: JSX.Element }[] = [];
    let lastDateLabel: string | null = null;

    // Add loading indicator at the top if fetching older messages
    if (hasMore && messages.length > 0) {
      arr.push({
        key: 'loading-older',
        element: (
          <div className="py-4 flex justify-center">
            <div className="text-gray-400 text-sm">Scroll up to load older messages</div>
          </div>
        ),
      });
    }

    messages.forEach((message, index) => {
      const dateLabel = formatDateGroup(message.created_at);

      if (dateLabel !== lastDateLabel) {
        arr.push({
          key: `date-${dateLabel}-${message.id}`,
          element: (
            <div className="py-4">
              <DateDivider label={dateLabel} />
            </div>
          ),
        });
        lastDateLabel = dateLabel;
      }

      arr.push({
        key: message.id,
        element: (
          <div className="pb-3 sm:pb-4 px-2 sm:px-4">
            <MessageBubble
              message={message}
              isOwnMessage={message.user_id === currentUserId}
              onUserClick={onUserClick}
            />
          </div>
        ),
      });
    });

    return arr;
  }, [messages, currentUserId, onUserClick, hasMore]);

  if (loading && messages.length === 0) {
    console.log('Showing loading spinner');
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    console.log('Showing error:', error);
    return (
      <div className="flex-1 bg-gray-900">
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (messages.length === 0) {
    console.log('Showing empty state');
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900 space-y-4">
        <div>
          <p className="text-gray-400 text-lg mb-2">No messages yet</p>
          <p className="text-gray-500">Be the first to say hello! 👋</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      <VirtualizedMessageList
        ref={listRef}
        items={items}
        height={listHeight}
        outerRef={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-900 relative w-full"
        onScroll={handleScroll}
      />
    </div>
  );
}