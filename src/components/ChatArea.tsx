import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { DateDivider } from './DateDivider';
import { formatDateGroup } from '../utils/formatDateGroup';
import { Message } from '../types/message';

interface ChatAreaProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  onRetry: () => void;
  fetchOlderMessages: () => void;
  hasMore: boolean;
  onUserClick?: (userId: string) => void;
  onHeartMessage?: (id: string, count: number) => void;
}

export function ChatArea({
  messages,
  currentUserId,
  loading,
  loadingOlder,
  error,
  onRetry,
  fetchOlderMessages,
  hasMore,
  onUserClick,
  onHeartMessage,
}: ChatAreaProps) {
  console.log('ChatArea render:', { 
    messagesCount: messages.length, 
    loading, 
    error,
    currentUserId 
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const isFetchingRef = useRef(false);
  const prevHeightRef = useRef(0);
  const prevMessagesLengthRef = useRef(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    // Auto-scroll on initial load or when near bottom
    if (!hasAutoScrolled.current || (isNearBottom && shouldAutoScroll)) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
        if (!hasAutoScrolled.current) {
          hasAutoScrolled.current = true;
        }
      }, 100);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, shouldAutoScroll]);

  // Handle scroll to load older messages and track scroll position
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (!container) return;

    // Check if user is near bottom to enable/disable auto-scroll
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShouldAutoScroll(isNearBottom);

    // Check if scrolled to top to load older messages
    if (container.scrollTop <= 100 && hasMore && !isFetchingRef.current) {
      console.log('Scrolled to top, fetching older messages...');
      prevHeightRef.current = container.scrollHeight;
      isFetchingRef.current = true;
      fetchOlderMessages();
    }
  }, [fetchOlderMessages, hasMore]);

  // Maintain scroll position after loading older messages
  useEffect(() => {
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

  // Prepare message items with date dividers
  const messageItems = useMemo(() => {
    const items: JSX.Element[] = [];
    let lastDateLabel: string | null = null;

    // Add loading indicator at the top if fetching older messages
    if (hasMore && messages.length > 0) {
      items.push(
        <div key="loading-older" className="py-4 flex justify-center">
          <div className="text-gray-400 text-sm">
            {loadingOlder ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Loading older messages...
              </div>
            ) : (
              'Scroll up to load older messages'
            )}
          </div>
        </div>
      );
    }

    messages.forEach((message) => {
      const dateLabel = formatDateGroup(message.created_at);

      if (dateLabel !== lastDateLabel) {
        items.push(
          <div key={`date-${dateLabel}-${message.id}`} className="py-4">
            <DateDivider label={dateLabel} />
          </div>
        );
        lastDateLabel = dateLabel;
      }

      items.push(
        <div key={message.id} className="pb-3 sm:pb-4 px-2 sm:px-4">
          <MessageBubble
            message={message}
            isOwnMessage={message.user_id === currentUserId}
            onUserClick={onUserClick}
            onHeart={() =>
              onHeartMessage?.(message.id, message.hearts_count ?? 0)
            }
          />
        </div>
      );
    });

    return items;
  }, [messages, currentUserId, onUserClick, onHeartMessage, hasMore, loadingOlder]);

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
        <button
          onClick={async () => {
            console.log('Testing database connection...');
            try {
              // Import supabase here since it's not imported at the top
              const { supabase } = await import('../lib/supabase');
              
              console.log('Current user ID:', currentUserId);
              
              // Test database connection first
              console.log('Step 1: Testing basic connection...');
              const { data: testData, error: testError } = await supabase
                .from('messages')
                .select('count')
                .limit(1);
              
              console.log('Database test result:', { testData, testError });
              
              if (testError) {
                throw new Error(`Database connection failed: ${testError.message}`);
              }
              
              // Check if user is properly authenticated
              console.log('Step 2: Checking authentication...');
              const { data: { user }, error: authError } = await supabase.auth.getUser();
              console.log('Auth check result:', { user: user?.id, authError });
              
              if (authError || !user) {
                throw new Error('User not authenticated');
              }
              
              // Try to insert a test message with the authenticated user
              console.log('Step 3: Inserting test message...');
              const { data, error } = await supabase
                .from('messages')
                .insert({
                  content: 'Hello! This is a test message from the system.',
                  user_name: 'System',
                  user_id: user.id,
                  avatar_color: '#3B82F6'
                })
                .select()
                .single();
              
              console.log('Test message result:', { data, error });
              if (error) {
                console.error('Failed to send test message:', error);
                alert(`Database error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
              } else {
                console.log('Test message sent successfully!');
                alert('Test message sent successfully! The chat should now show messages.');
              }
            } catch (err) {
              console.error('Error testing database:', err);
              alert(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test Database Connection
        </button>
        
        <div className="mt-4 text-xs text-gray-500 max-w-md">
          <p>Debug info:</p>
          <p>User ID: {currentUserId}</p>
          <p>Messages count: {messages.length}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-900 relative w-full"
        onScroll={handleScroll}
      >
        <div className="min-h-full">
          {messageItems}
        </div>
      </div>
    </div>
  );
}