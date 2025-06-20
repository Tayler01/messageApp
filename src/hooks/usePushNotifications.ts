import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/sw.js');
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
          });
        }

        await supabase.from('subscriptions').insert({
          user_id: userId,
          subscription,
        });
      } catch (err) {
        console.error('Push subscription failed', err);
      }
    };

    register();
  }, [userId]);
}
