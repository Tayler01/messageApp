import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { Search, MessageSquare, Send, X, Clock, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_AVATAR_COLOR } from '../utils/avatarColors';
import { DMConversation } from '../types/dm';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_color: string;
  bio?: string;
}


interface DMsPageProps {
  currentUser: {
    id: string;
    username: string;
    avatar_color: string;
    avatar_url?: string;
  };
  onUserClick?: (userId: string) => void;
  unreadConversations?: string[];
  markAsRead?: (conversationId: string, timestamp: string) => void;
  onConversationOpen?: (id: string | null) => void;
  activeConversationId?: string | null;
}

export function DMsPage({ currentUser, onUserClick, unreadConversations = [], markAsRead, onConversationOpen, activeConversationId }: DMsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('all');
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [listHeight, setListHeight] = useState(0);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  // Effect to handle external conversation selection (from banner clicks)
  useEffect(() => {
    if (!activeConversationId) return;
    
    // If we already have this conversation selected, don't do anything
    if (selectedConversation?.id === activeConversationId) return;
    
    console.log('Looking for conversation:', activeConversationId);
    console.log('Available conversations:', conversations.map(c => c.id));
    
    // First, try to find the conversation in the current list
    const conversation = conversations.find(conv => conv.id === activeConversationId);
    if (conversation) {
      console.log('Found conversation in list, selecting:', conversation.id);
      setSelectedConversation(conversation);
    } else if (conversations.length > 0 && !isLoadingConversation) {
      // If conversation not found and we have conversations loaded, fetch it specifically
      console.log('Conversation not found in list, fetching:', activeConversationId);
      setIsLoadingConversation(true);
      
      const fetchConversation = async () => {
        try {
          const { data, error } = await supabase
            .from('dms')
            .select('*')
            .eq('id', activeConversationId)
            .single();

          if (error) {
            console.error('Error fetching conversation:', error);
            return;
          }
          
          if (data) {
            console.log('Fetched conversation:', data.id);
            setSelectedConversation(data);
            // Add to conversations list if not already there
            setConversations(prev => {
              const exists = prev.find(conv => conv.id === data.id);
              if (exists) return prev;
              return [data, ...prev];
            });
          }
        } catch (err) {
          console.error('Error fetching conversation:', err);
        } finally {
          setIsLoadingConversation(false);
        }
      };
      
      fetchConversation();
    }
  }, [activeConversationId, conversations, selectedConversation, isLoadingConversation]);

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (messageContainerRef.current) {
        setListHeight(messageContainerRef.current.offsetHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    if (onConversationOpen) {
      onConversationOpen(selectedConversation ? selectedConversation.id : null);
      console.log('Conversation opened:', selectedConversation?.id);
    }

    if (selectedConversation && markAsRead) {
      const last = selectedConversation.messages[selectedConversation.messages.length - 1];
      if (last) {
        markAsRead(selectedConversation.id, last.created_at);
      }
    }
  }, [selectedConversation, onConversationOpen, markAsRead]);

  useEffect(() => {
    const cleanupConnections = () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };

    const setupRealtimeSubscription = () => {
      cleanupConnections();

      const channel = supabase
        .channel('dms_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dms' },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const updatedConversation = payload.new as DMConversation;
              setConversations(prev => {
                const existingIndex = prev.findIndex(conv => conv.id === updatedConversation.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = updatedConversation;
                  return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                } else {
                  return [updatedConversation, ...prev];
                }
              });

              if (selectedConversation?.id === updatedConversation.id) {
                setSelectedConversation(updatedConversation);
              }
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    const fetchCurrentUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, avatar_url, avatar_color, bio')
          .eq('id', currentUser.id)
          .single();

        if (error) throw error;
        setCurrentUserData(data);
      } catch (err) {
        console.error('Error fetching current user data:', err);
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, avatar_url, avatar_color, bio')
          .neq('id', currentUser.id)
          .order('username');

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    const fetchConversations = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('dms')
          .select('*')
          .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setConversations(data || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUserData();
    fetchUsers();
    fetchConversations();
    setupRealtimeSubscription();

    return () => {
      cleanupConnections();
    };
  }, [selectedConversation?.id, currentUser.id]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (container && selectedConversation?.messages.length) {
      container.scrollTop = container.scrollHeight;
    }
  }, [selectedConversation?.messages]);


  const startConversation = async (user: User) => {
    try {
      // Get or create conversation
      const { data: conversationId, error } = await supabase.rpc('get_or_create_dm_conversation', {
        current_user_id: currentUser.id,
        other_user_id: user.id,
        current_username: currentUser.username,
        other_username: user.username
      });

      if (error) throw error;

      // Fetch the conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('dms')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;

      setSelectedConversation(conversation);
      
      // Add to conversations if not already there
      setConversations(prev => {
        const exists = prev.find(conv => conv.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      await supabase.rpc('append_dm_message', {
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        message_text: newMessage.trim()
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const getOtherUser = useCallback((conversation: DMConversation) => {
    if (conversation.user1_id === currentUser.id) {
      return {
        id: conversation.user2_id,
        username: conversation.user2_username
      };
    } else {
      return {
        id: conversation.user1_id,
        username: conversation.user1_username
      };
    }
  }, [currentUser.id]);

  const getOtherUserData = useCallback((conversation: DMConversation) => {
    const otherUser = getOtherUser(conversation);
    return users.find(u => u.id === otherUser.id) || {
      id: otherUser.id,
      username: otherUser.username,
      avatar_color: DEFAULT_AVATAR_COLOR
    };
  }, [getOtherUser, users]);


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderedMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return selectedConversation.messages.map((message) => (
      <div key={message.id} className="mb-4">
        <div
          className={`flex gap-3 ${
            message.sender_id === currentUser.id ? 'flex-row-reverse' : ''
          }`}
        >
          <button
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
            onClick={() => {
              onUserClick?.(message.sender_id);
            }}
            title={`View ${
              message.sender_id === currentUser.id
                ? currentUser.username
                : getOtherUser(selectedConversation).username
            }'s profile`}
          >
            {message.sender_id === currentUser.id ? (
              currentUserData?.avatar_url ? (
                <img src={currentUserData.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: currentUserData?.avatar_color || currentUser.avatar_color }}
                >
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )
            ) : (() => {
              const otherUserData = getOtherUserData(selectedConversation);
              return otherUserData.avatar_url ? (
                <img src={otherUserData.avatar_url} alt={otherUserData.username} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: otherUserData.avatar_color }}
                >
                  {otherUserData.username.charAt(0).toUpperCase()}
                </div>
              );
            })()}
          </button>

          <div
            className={`flex flex-col max-w-xs sm:max-w-md ${
              message.sender_id === currentUser.id ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl ${
                message.sender_id === currentUser.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg border border-blue-500/20'
                  : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600/50'
              }`}
            >
              <p className="text-sm leading-relaxed break-words">{message.content}</p>
            </div>
            <span className="text-xs text-gray-400 mt-1">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    ));
  }, [selectedConversation, currentUser, currentUserData, onUserClick, getOtherUser, getOtherUserData]);

  return (
    <div className="h-[calc(100vh-5rem)] overflow-hidden bg-gray-900">
      <div className="flex px-2 sm:px-8 lg:px-16 py-2 sm:py-6 h-full gap-2 sm:gap-6 relative">
        {/* Contacts Sidebar */}
        <div className={`${
          selectedConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 bg-gray-800 rounded-xl border border-gray-600/50 shadow-xl flex-col overflow-hidden`}>
          {/* Search */}
          <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-gray-600/50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Contacts
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700/80 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-gray-400 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-600/50 bg-gray-800/50">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              All Users
            </button>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Recent Conversations Tab */}
                {activeTab === 'recent' && (
                  <div className="p-3">
                    {conversations.filter(conv => {
                      const otherUser = getOtherUser(conv);
                      return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                    }).length > 0 ? (
                      conversations.filter(conv => {
                        const otherUser = getOtherUser(conv);
                        return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                      }).map(conversation => {
                        const otherUserData = getOtherUserData(conversation);
                        const lastMessage = conversation.messages[conversation.messages.length - 1];
                        
                        return (
                          <button
                            key={conversation.id}
                            onClick={() => {
                              setSelectedConversation(conversation);
                              console.log('Manually selected conversation:', conversation.id);
                            }}
                            className={`relative w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30 ${
                              selectedConversation?.id === conversation.id ? 'bg-gray-700/60 border-emerald-500/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-600/30">
                                {otherUserData.avatar_url ? (
                                  <img
                                    src={otherUserData.avatar_url}
                                    alt={otherUserData.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                                    style={{ backgroundColor: otherUserData.avatar_color }}
                                  >
                                    {otherUserData.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">
                                  {otherUserData.username}
                                </p>
                                {lastMessage && (
                                  <p className="text-sm text-gray-400 truncate">
                                    {lastMessage.content}
                                  </p>
                                )}
                              </div>
                              {unreadConversations.includes(conversation.id) && (
                                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No recent conversations</p>
                        <p className="text-gray-500 text-xs mt-1">Start chatting to see conversations here</p>
                      </div>
                    )}
                  </div>
                )}

                {/* All Users Tab */}
                {activeTab === 'all' && (
                  <div className="p-3">
                    {users.filter(user =>
                      user.username.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length > 0 ? (
                      users.filter(user =>
                        user.username.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(user => {
                        const existing = conversations.find(c =>
                          (c.user1_id === currentUser.id ? c.user2_id : c.user1_id) === user.id
                        );
                        const hasUnread = existing ? unreadConversations.includes(existing.id) : false;
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              startConversation(user);
                              console.log('Starting conversation with user:', user.id);
                            }}
                            className="relative w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-600/30">
                              {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.username}
                                    className="w-full h-full object-cover"
                                  />
                              ) : (
                                <div 
                                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: user.avatar_color }}
                                >
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{user.username}</p>
                              </div>
                              {hasUnread && (
                                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No users found</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${
          selectedConversation ? 'flex' : 'hidden md:flex'
        } flex-1 bg-gray-800 rounded-xl border border-gray-600/50 shadow-xl flex-col overflow-hidden ${
          selectedConversation ? 'absolute md:relative inset-0 md:inset-auto z-10 md:z-auto' : ''
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-600/50 flex items-center justify-between backdrop-blur-sm">
                {/* Mobile back button */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  {(() => {
                    const otherUserData = getOtherUserData(selectedConversation);
                    return (
                      <>
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-400/30">
                          {otherUserData.avatar_url ? (
                            <img
                              src={otherUserData.avatar_url}
                              alt={otherUserData.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: otherUserData.avatar_color }}
                            >
                              {otherUserData.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {otherUserData.username}
                          </h3>
                          <p className="text-xs text-blue-300/80">Direct Message</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="hidden md:block p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              {selectedConversation.messages.length === 0 ? (
                <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-center" ref={messageContainerRef}>
                  <div>
                    <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">Start a conversation</p>
                    <p className="text-gray-500">
                      Send a message to {getOtherUser(selectedConversation).username}
                    </p>
                  </div>
                </div>
              ) : (
                <div 
                  ref={messageContainerRef}
                  className="flex-1 overflow-y-auto p-4"
                >
                  <div className="space-y-1">
                    {renderedMessages}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-gray-600/50 bg-gray-800/50 safe-area-inset-bottom">
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex justify-center w-full"
                >
                  <div className="relative w-full max-w-2xl min-w-0">
                    <div className="bg-gray-700/80 border border-gray-600/50 rounded-3xl px-3 sm:px-4 pr-12 sm:pr-14 py-2.5 text-white focus-within:ring-2 focus-within:ring-blue-500 shadow-lg transition-all duration-150 backdrop-blur-sm">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${getOtherUser(selectedConversation).username}...`}
                        className="w-full bg-transparent placeholder-gray-400 text-sm sm:text-base focus:outline-none"
                        style={{
                          fontSize: '16px', // Prevents zoom on iOS
                          lineHeight: '1.5'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 sm:p-2.5 rounded-full hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                <p className="text-gray-400">
                  Choose a user from the contacts list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}