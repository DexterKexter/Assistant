import { createClient } from '@/lib/supabase/server'
import { carrierRequestText, type CargoRequest } from '@/lib/cargo-requests'
import { tg } from '@/lib/telegram'

// Called after a request is created: if its carrier has a Telegram group,
// the bot posts the request there (once per group).
export async function POST(req: Request) {
  const { id } = await req.json()
  // User session, not service role: RLS lets only admins/managers read requests and carriers.
  const supabase = await createClient()
  const { data } = await supabase.from('cargo_requests').select('*, sender:senders(name)').eq('id', id).single()
  const request = data as (CargoRequest & { carrier_id: string | null; carrier_chat_id: number | null; weight_kg: number | null; container_owner: string | null; via: string | null; shipper_phone: string | null; sender: { name: string } | null; sender_name: string | null }) | null
  if (!request) return new Response('not found', { status: 404 })
  if (!request.carrier_id) return Response.json({ carrier_message_id: null })

  const { data: carrier } = await supabase.from('carriers').select('telegram_chat_id').eq('id', request.carrier_id).maybeSingle()
  if (!carrier?.telegram_chat_id || carrier.telegram_chat_id === request.carrier_chat_id) return Response.json({ carrier_message_id: null })

  const sent = await (await tg('sendMessage', { chat_id: carrier.telegram_chat_id, text: carrierRequestText({ ...request, yard: request.sender?.name ?? request.sender_name }),
    // Pressed by the carrier to confirm; handled in the Telegram webhook.
    reply_markup: { inline_keyboard: [[{ text: '✅ Accepted', callback_data: 'accept' }]] },
  })).json()
  if (!sent.ok) return new Response('telegram error', { status: 502 })

  const carrier_message_id: number = sent.result.message_id
  await supabase.from('cargo_requests').update({ carrier_chat_id: carrier.telegram_chat_id, carrier_message_id }).eq('id', id)
  return Response.json({ carrier_message_id })
}
