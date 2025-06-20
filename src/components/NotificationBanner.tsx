import React, { useEffect } from 'react';

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
      onClick={() => onClick?.(notification.conversationId)}
      className="fixed top-16 inset-x-0 sm:top-16 sm:right-4 sm:left-auto sm:w-80 bg-gray-800/90 border border-gray-700 text-white px-4 py-2 rounded-none sm:rounded-lg shadow-xl z-50 cursor-pointer hover:bg-gray-700/90 transition-colors"
    >
      <p className="text-sm truncate">
        <span className="font-semibold mr-1">{notification.senderUsername}:</span>
        {notification.content}
      </p>
    </div>
  );
}

