import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()

    if (!record) {
      return new Response(
        JSON.stringify({ error: 'No record provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all users except the sender
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id')
      .neq('id', record.user_id)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send notifications to all users
    const notificationPromises = users.map(async (user) => {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            userId: user.id,
            payload: {
              title: 'New Message',
              body: `${record.user_name}: ${record.content}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'new-message',
              data: {
                type: 'new-message',
                messageId: record.id,
                senderId: record.user_id,
                senderName: record.user_name,
              }
            }
          })
        })

        return { userId: user.id, success: response.ok }
      } catch (error) {
        console.error(`Error notifying user ${user.id}:`, error)
        return { userId: user.id, success: false, error: error.message }
      }
    })

    const results = await Promise.all(notificationPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        message: `Notified ${successCount}/${results.length} users`,
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in notify-new-message function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})