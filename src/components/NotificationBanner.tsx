import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BannerProps {
  message: { senderUsername: string; content: string } | null;
  onClose: () => void;
}

export function NotificationBanner({ message, onClose }: BannerProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 8000); // Increased timeout
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm mx-4 animate-slide-down">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-300 mb-1">New Message</p>
          <p className="text-sm">
            <span className="font-semibold">{message.senderUsername}:</span> {message.content}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

