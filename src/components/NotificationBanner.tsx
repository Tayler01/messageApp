import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BannerProps {
  notification: {
    conversationId: string;
    senderUsername: string;
    content: string;
  } | null;
  onClose: () => void;
  onClick?: (conversationId: string) => void;
}

export function NotificationBanner({ notification, onClose, onClick }: BannerProps) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div
      onClick={() => {
        onClick?.(notification.conversationId);
        onClose();
      }}
      className="fixed top-16 inset-x-0 sm:top-16 sm:right-4 sm:left-auto sm:w-[30rem] bg-gradient-to-r from-blue-600 to-purple-700 border border-gray-700 text-white px-6 py-3 rounded-none sm:rounded-lg shadow-xl z-50 cursor-pointer hover:from-blue-500 hover:to-purple-600 transition-colors"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-2 right-2 text-white hover:text-gray-200"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-base truncate pr-6">
        <span className="font-semibold mr-1">{notification.senderUsername}:</span>
        {notification.content}
      </p>
    </div>
  );
}

