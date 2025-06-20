import React from 'react';
import { Heart } from 'lucide-react';
import { Message } from '../types/message';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onUserClick?: (userId: string) => void;
  onHeart?: () => void;
}

export function MessageBubble({ message, isOwnMessage, onUserClick, onHeart }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex gap-2 sm:gap-3 ${isOwnMessage ? 'flex-row-reverse justify-start' : 'justify-start'} max-w-full`}>
      <button
        onClick={() => onUserClick?.(message.user_id)}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer overflow-hidden relative"
        style={{ backgroundColor: message.avatar_color }}
        title={`View ${message.user_name}'s profile`}
      >
        {message.avatar_url ? (
          <img
            src={message.avatar_url}
            alt={message.user_name}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              // If image fails to load, hide it and show initials
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }
            }}
          />
        ) : (
          message.user_name.charAt(0).toUpperCase()
        )}
        {message.avatar_url && (
          <span className="avatar-fallback absolute inset-0 flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ display: 'none' }}>
            {message.user_name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} min-w-0 max-w-[75%] sm:max-w-[65%]`}>
        <div className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl max-w-full ${
          isOwnMessage
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg'
            : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600'
        }`}>
          <p className="text-xs sm:text-sm leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">{message.content}</p>
        </div>
        
        <div className={`flex items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-400 ${
          isOwnMessage ? 'flex-row-reverse' : ''
        }`}>
          <span className="font-medium text-xs">{message.user_name}</span>
          <span>•</span>
          <span className="text-xs">{formatTime(message.created_at)}</span>
          <button
            onClick={onHeart}
            className="ml-2 flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart
              className="w-3 h-3"
              fill={message.hearts_count && message.hearts_count > 0 ? 'currentColor' : 'none'}
            />
            {message.hearts_count ? (
              <span>{message.hearts_count}</span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}