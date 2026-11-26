import { createServiceClient, waSendText, waSendTemplate } from '@/lib/crm'
import { TEMPLATE_LANGUAGE } from '@/lib/whatsapp-template'
import { buildNotification, eventStillTrue, type NotifyEvent } from '@/lib/shipment-notify'

type Result = { ok: true } | { ok: false; status: 'failed' | 'cancelled'; error: string }

// Sends one shipment-status message to the shipment's client and records it in their chat.
// requireOptIn: the automatic queue respects the client's switch; a manager pressing the button does not need it.
export async function deliverNotification(shipmentId: string, event: NotifyEvent, requireOptIn: boolean): Promise<Result> {
  const supabase = createServiceClient()
  const fail = (error: string, status: 'failed' | 'cancelled' = 'failed'): Result => ({ ok: false, status, error })
  try {
    const { data: s } = await supabase.from('shipments')
      .select('container_number, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, is_completed, client_id')
      .eq('id', shipmentId).maybeSingle()
    if (!s) return fail('перевозка не найдена', 'cancelled')
    if (!s.client_id) return fail('у перевозки не указан клиент')
    const { data: client } = await supabase.from('clients').select('name, is_russia, phone, wa_notify').eq('id', s.client_id).maybeSingle()
    if (!client) return fail('клиент не найден', 'cancelled')
    if (requireOptIn && !client.wa_notify) return fail('уведомления для клиента выключены', 'cancelled')
    if (!eventStillTrue(event, s)) return fail('дата убрана до отправки', 'cancelled')

    const { data: chat } = await supabase.from('crm_chats').select('id, external_id')
      .eq('client_id', s.client_id).order('last_message_at', { ascending: false }).limit(1).maybeSingle()
    const to = chat?.external_id || (client.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')
    if (!to) return fail('у клиента нет номера WhatsApp')

    const built = buildNotification(event, s, client.name, !!client.is_russia, Date.now())
    if ('error' in built) return fail(built.error)

    // Free-form text is only delivered within 24h of the client's last message; otherwise an approved template is required.
    const { data: lastIn } = chat
      ? await supabase.from('crm_messages').select('created_at').eq('chat_id', chat.id).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null }
    const windowOpen = !!lastIn && Date.now() - new Date(lastIn.created_at).getTime() < 24 * 3600 * 1000
    if (windowOpen) await waSendText(to, built.text)
    else if (built.template) await waSendTemplate(to, built.template.name, TEMPLATE_LANGUAGE, built.template.params)
    else return fail('клиент не писал больше 24 часов, а шаблона для этого события нет')

    const chatId = chat?.id ?? (await supabase.from('crm_chats')
      .insert({ channel: 'whatsapp', external_id: to, name: client.name, phone: `+${to}`, client_id: s.client_id, unread_count: 0, greeted_at: new Date().toISOString() })
      .select('id').single()).data?.id
    if (chatId) {
      const { data: message } = await supabase.from('crm_messages')
        .insert({ chat_id: chatId, direction: 'out', text: built.text, shipment_id: shipmentId, sender_id: null }).select('created_at').single()
      await supabase.from('crm_chats').update({ last_message_text: built.text, last_message_at: message?.created_at ?? new Date().toISOString() }).eq('id', chatId)
    }
    return { ok: true }
  } catch (e) {
    return fail((e as Error).message.slice(0, 300))
  }
}
