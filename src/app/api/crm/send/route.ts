import { createClient } from '@/lib/supabase/server'
import { tg, waSendText } from '@/lib/crm'

export async function POST(req: Request) {
  const { chatId, text, shipmentId } = await req.json()
  if (!chatId || typeof text !== 'string' || !text.trim()) return new Response('bad request', { status: 400 })

  // User-session client: RLS lets only admin/manager see crm_chats.
  const supabase = await createClient()
  const { data: chat } = await supabase.from('crm_chats').select('id, channel, external_id').eq('id', chatId).maybeSingle()
  if (!chat) return new Response('not found', { status: 404 })
  try {
    if (chat.channel === 'whatsapp') await waSendText(chat.external_id, text)
    else await tg('sendMessage', { chat_id: chat.external_id, text })
  } catch (e) {
    return new Response((e as Error).message, { status: 502 })
  }

  const { data: message, error } = await supabase.from('crm_messages')
    .insert({ chat_id: chat.id, direction: 'out', text, shipment_id: shipmentId ?? null }).select().single()
  if (error) return new Response(error.message, { status: 500 })
  await supabase.from('crm_chats').update({ last_message_text: text, last_message_at: message.created_at }).eq('id', chat.id)

  return Response.json(message)
}
