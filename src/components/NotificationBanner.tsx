import React, { useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';

interface BannerProps {
  message: { senderUsername: string; content: string; conversationId?: string } | null;
  onClose: () => void;
  onNavigate?: (conversationId: string) => void;
}

export function NotificationBanner({ message, onClose, onNavigate }: BannerProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 8000); // Increased timeout
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const handleClick = () => {
    if (message.conversationId && onNavigate) {
      onNavigate(message.conversationId);
    }
    onClose();
  };

  return (
    <div className="fixed top-20 right-4 bg-gray-800 border border-gray-700 text-white rounded-lg shadow-xl z-50 max-w-sm animate-slide-down">
      <div 
        className={`flex items-start gap-3 p-4 ${message.conversationId ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : ''}`}
        onClick={message.conversationId ? handleClick : undefined}
      >
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-300 mb-1">New Direct Message</p>
          <p className="text-sm">
            <span className="font-semibold">{message.senderUsername}:</span> {message.content}
          </p>
          {message.conversationId && (
            <p className="text-xs text-gray-400 mt-1">Click to view conversation</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-colors rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}