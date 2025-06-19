import React, { useEffect } from 'react';

interface BannerProps {
  message: { senderUsername: string; content: string } | null;
  onClose: () => void;
}

export function NotificationBanner({ message, onClose }: BannerProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <p className="text-sm">
        <span className="font-semibold">{message.senderUsername}:</span> {message.content}
      </p>
    </div>
  );
}

