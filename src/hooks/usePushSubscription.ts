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

        // Check for existing subscription for this user
        const { data: existingRow, error: selectError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          console.error('Error checking subscription:', selectError);
          return;
        }

        if (existingRow) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ subscription: sub })
            .eq('id', existingRow.id);
          if (updateError) {
            console.error('Error updating subscription:', updateError);
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({ user_id: userId, subscription: sub });

          if (insertError) {
            if (insertError.code === '23505') {
              // Unique constraint failed, update instead
              const { error: updateError } = await supabase
                .from('subscriptions')
                .update({ subscription: sub })
                .eq('user_id', userId);
              if (updateError) {
                console.error('Error updating subscription:', updateError);
              }
            } else {
              console.error('Error saving subscription:', insertError);
            }
          }
        }
      } catch (err) {
        console.error('Failed to subscribe to push notifications', err);
      }
    };

    subscribe();
  }, [userId]);
}
