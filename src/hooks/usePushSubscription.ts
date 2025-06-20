import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePushSubscription(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    
    const subscribe = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        
        // Check for existing subscription
        const existing = await registration.pushManager.getSubscription();
        
        let subscription = existing;
        
        // Create new subscription if none exists
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({ 
            userVisibleOnly: true,
            applicationServerKey: null // Using browser's default VAPID key
          });
        }

        if (!subscription) return;

        // Save subscription to database
        const { error } = await supabase
          .from('subscriptions')
          .upsert({ 
            user_id: userId, 
            subscription: subscription.toJSON() 
          }, {
            onConflict: 'user_id'
          });

        if (error) console.error('Error saving subscription:', error);
        
      } catch (err) {
        console.error('Failed to subscribe to push notifications', err);
      }
    };

    // Set up message listener for notification clicks
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        // Handle notification click navigation
        const { targetUrl, data } = event.data;
        
        if (targetUrl.includes('page=dms')) {
          // Navigate to DMs page
          window.location.hash = '#dms';
        } else if (targetUrl.includes('page=group-chat')) {
          // Navigate to group chat
          window.location.hash = '#group-chat';
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    subscribe();
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [userId]);
}
