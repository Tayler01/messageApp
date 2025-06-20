import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePushSubscription(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    const subscribe = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const sub =
          existing ||
          (await registration.pushManager.subscribe({ userVisibleOnly: true }));

        if (!sub) return;

        const { error } = await supabase
          .from('subscriptions')
          .insert({ user_id: userId, subscription: sub });

        if (error) console.error('Error saving subscription:', error);
      } catch (err) {
        console.error('Failed to subscribe to push notifications', err);
      }
    };

    subscribe();
  }, [userId]);
}
