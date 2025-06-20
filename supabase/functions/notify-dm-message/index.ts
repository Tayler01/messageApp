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

    if (!record || !record.messages || record.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid DM record provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the latest message
    const latestMessage = record.messages[record.messages.length - 1]
    
    // Determine the recipient (the user who didn't send the message)
    const recipientId = latestMessage.sender_id === record.user1_id 
      ? record.user2_id 
      : record.user1_id
    
    const senderUsername = latestMessage.sender_id === record.user1_id 
      ? record.user1_username 
      : record.user2_username

    // Send notification to the recipient
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          userId: recipientId,
          payload: {
            title: `Message from ${senderUsername}`,
            body: latestMessage.content,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `dm-${record.id}`,
            data: {
              type: 'dm-message',
              conversationId: record.id,
              messageId: latestMessage.id,
              senderId: latestMessage.sender_id,
              senderName: senderUsername,
            }
          }
        })
      })

      return new Response(
        JSON.stringify({ 
          message: `DM notification sent to user ${recipientId}`,
          success: response.ok 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error(`Error sending DM notification:`, error)
      return new Response(
        JSON.stringify({ error: 'Failed to send DM notification' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in notify-dm-message function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})