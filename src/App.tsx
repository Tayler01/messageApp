import React, { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { ChatHeader } from './components/ChatHeader';
import { ChatArea } from './components/ChatArea';
import { MessageInput } from './components/MessageInput';
import { UserProfile } from './components/UserProfile';
import { ProfilePreviewModal } from './components/ProfilePreviewModal';
import { DMsPage } from './components/DMsPage';
import { NotificationBanner } from './components/NotificationBanner';
import { useMessages } from './hooks/useMessages';
import { useAuth } from './hooks/useAuth';
import { useDMNotifications } from './hooks/useDMNotifications';
import { usePushSubscription } from './hooks/usePushSubscription';
import { LoadingSpinner } from './components/LoadingSpinner';
import { supabase } from './lib/supabase';

type PageType = 'group-chat' | 'dms' | 'profile';

function App() {
  const { user, loading: authLoading, signOut, updateUser } = useAuth();
  
  console.log('App render:', { 
    user: user ? { id: user.id, username: user.username } : null, 
    authLoading 
  });
  
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('group-chat');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Only call useMessages if user is authenticated
  const {
    messages,
    loading,
    loadingOlder,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
  } = useMessages();

  const {
    unreadConversations,
    banner,
    clearBanner,
    markAsRead,
  } = useDMNotifications(user?.id ?? null, currentPage, activeConversationId);

  usePushSubscription(user?.id ?? null);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="h-screen bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }
  
  // Show profile page if requested
  if (currentPage === 'profile') {
    return (
      <UserProfile
        user={user}
        onUserUpdate={updateUser}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    );
  }

  const handleSendMessage = async (content: string) => {
    if (user) {
      try {
        // Get the latest user data including avatar_url
        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        await sendMessage(content, user.username, user.id, user.avatar_color, userData?.avatar_url || null);
      } catch (err) {
        console.error('Failed to send message:', err);
        // You could show a toast notification here
      }
    }
  };

  const handleUserClick = (userId: string) => {
    // Only show preview for other users, not current user
    if (userId && userId !== user.id) {
      setPreviewUserId(userId);
    }
  };

  // Show DMs page
  if (currentPage === 'dms') {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        <ChatHeader
          userName={user.username}
          onClearUser={signOut}
          onShowProfile={() => setCurrentPage('profile')}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          hasUnreadDMs={unreadConversations.length > 0}
        />
        <DMsPage
          currentUser={user}
          onUserClick={handleUserClick}
          unreadConversations={unreadConversations}
          markAsRead={markAsRead}
          onConversationOpen={setActiveConversationId}
          activeConversationId={activeConversationId}
        />
        <NotificationBanner
          notification={banner}
          onClose={clearBanner}
          onClick={(id) => {
            setCurrentPage('dms');
            setActiveConversationId(id);
          }}
        />
        {previewUserId && (
          <ProfilePreviewModal
            userId={previewUserId}
            onClose={() => setPreviewUserId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <ChatHeader
        userName={user.username}
        onClearUser={signOut}
        onShowProfile={() => setCurrentPage('profile')}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        hasUnreadDMs={unreadConversations.length > 0}
      />

      <div className="flex-1 overflow-hidden">
        <ChatArea
          messages={messages}
          currentUserId={user.id}
          loading={loading}
          loadingOlder={loadingOlder}
          error={error}
          onRetry={() => window.location.reload()}
          fetchOlderMessages={fetchOlderMessages}
          hasMore={hasMore}
          onUserClick={handleUserClick}
        />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={loading}
      />

      <NotificationBanner
        notification={banner}
        onClose={clearBanner}
        onClick={(id) => {
          setCurrentPage('dms');
          setActiveConversationId(id);
        }}
      />

      {previewUserId && (
        <ProfilePreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
        />
      )}
    </div>
  );
}

export default App;