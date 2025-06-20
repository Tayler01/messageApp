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
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualizedMessageListHandle>(null);
  const hasAutoScrolled = useRef(false);
  const isFetchingRef = useRef(false);
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

    // Always scroll to bottom for new messages, with a small delay to ensure rendering
    const scrollToBottom = () => {
      if (listRef.current) {
        listRef.current.scrollToItem(messages.length - 1);
      }
    };

    // Use requestAnimationFrame to ensure the list has rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });

    hasAutoScrolled.current = true;
  }, [messages]);

  const handleScroll = useCallback(() => {
  const container = containerRef.current;
  if (!container || !hasMore || isFetchingRef.current) return;

  if (container.scrollTop === 0) {
    const previousHeight = container.scrollHeight;
    isFetchingRef.current = true;

    fetchOlderMessages();
    
    // Use a timeout to restore scroll position after messages load
    setTimeout(() => {
      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;

        isFetchingRef.current = false;
      });
    }, 100);
  }
  }, [fetchOlderMessages, hasMore]);

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
            <div className="my-4">
              <DateDivider label={dateLabel} />
            </div>
          ),
        });
        lastDateLabel = dateLabel;
      }

      arr.push({
        key: message.id,
        element: (
          <MessageBubble
            message={message}
            isOwnMessage={message.user_id === currentUserId}
            onUserClick={onUserClick}
          />
        ),
      });
    });

    return arr;
  }, [messages, currentUserId, onUserClick]);

  if (loading && messages.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (messages.length === 0) {
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
    <div className="flex-1 relative">
      <VirtualizedMessageList
        ref={listRef}
        items={items}
        height={listHeight}
        outerRef={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-1 bg-gray-900"
        onScroll={handleScroll}
      />
    </div>
  );
}


