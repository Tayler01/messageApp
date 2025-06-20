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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (!hasAutoScrolled.current) {
      listRef.current?.scrollToItem(messages.length - 1);
      hasAutoScrolled.current = true;
    } else if (isNearBottom) {
      listRef.current?.scrollToItem(messages.length - 1);
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasMore || isFetchingRef.current) return;

    if (container.scrollTop === 0) {
      prevHeightRef.current = container.scrollHeight;
      isFetchingRef.current = true;
      fetchOlderMessages();
    }
  }, [fetchOlderMessages, hasMore]);

  useLayoutEffect(() => {
    if (!isFetchingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const newHeight = container.scrollHeight;
      container.scrollTop = newHeight - prevHeightRef.current;
      isFetchingRef.current = false;
    });
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const items = useMemo(() => {
    const arr: { key: string; element: JSX.Element }[] = [];
    let lastDateLabel: string | null = null;

    messages.forEach((message) => {
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
  }, [messages, currentUserId, onUserClick]);

  if (loading && messages.length === 0) {
    console.log('Showing loading spinner');
    return <LoadingSpinner />;
  }

  if (error) {
    console.log('Showing error:', error);
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (messages.length === 0) {
    console.log('Showing empty state');
    return (
      <div className="flex items-center justify-center p-8 text-center flex-1">
        <div>
          <p className="text-gray-400 text-lg mb-2">No messages yet</p>
          <p className="text-gray-500">Be the first to say hello! 👋</p>
        </div>
      </div>
    );
  }

  return (
    <VirtualizedMessageList
      ref={listRef}
      items={items}
      height={listHeight}
      outerRef={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-900 relative w-full"
      onScroll={handleScroll}
    />
  );
}


