import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, payload } = await req.json()

    if (!userId || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all subscriptions for the user
    const { data: subscriptions, error } = await supabaseClient
      .from('subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send push notifications to all user's subscriptions
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const subscription = sub.subscription as PushSubscription
        
        // Use the Web Push API to send notification
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400', // 24 hours
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          console.error(`Push failed for endpoint ${subscription.endpoint}:`, response.status)
          
          // If subscription is invalid (410 Gone), remove it
          if (response.status === 410) {
            await supabaseClient
              .from('subscriptions')
              .delete()
              .eq('subscription->endpoint', subscription.endpoint)
          }
        }

        return { success: response.ok, status: response.status }
      } catch (error) {
        console.error('Error sending push notification:', error)
        return { success: false, error: error.message }
      }
    })

    const results = await Promise.all(pushPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount}/${results.length} notifications`,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-push-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})