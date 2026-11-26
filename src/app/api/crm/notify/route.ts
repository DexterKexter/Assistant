import { createServiceClient, waSendText, waSendTemplate } from '@/lib/crm'
import { TEMPLATE_LANGUAGE } from '@/lib/whatsapp-template'
import { buildNotification, eventStillTrue, type NotifyEvent } from '@/lib/shipment-notify'

// Called every minute by the database (pg_cron) when notifications are due.
// Deliberately takes no input and needs no secret: all it can do is drain the queue that the
// shipments trigger filled, and each row is claimed atomically, so extra calls are harmless.
export async function POST() {
  const supabase = createServiceClient()
  const { data: due } = await supabase.from('crm_notifications').select('id, event, shipment_id')
    .eq('status', 'pending').lte('send_after', new Date().toISOString()).order('send_after').limit(20)

  let sent = 0
  for (const n of due || []) {
    // Claim first: a concurrent run must not send the same message twice.
    const { data: claimed } = await supabase.from('crm_notifications').update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', n.id).eq('status', 'pending').select('id')
    if (!claimed?.length) continue
    const finish = (status: 'failed' | 'cancelled', error: string) =>
      supabase.from('crm_notifications').update({ status, error, sent_at: null }).eq('id', n.id)

    try {
      const { data: s } = await supabase.from('shipments')
        .select('container_number, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, is_completed, client_id')
        .eq('id', n.shipment_id).maybeSingle()
      const { data: client } = s?.client_id
        ? await supabase.from('clients').select('name, is_russia, phone, wa_notify').eq('id', s.client_id).maybeSingle()
        : { data: null }
      if (!s || !client?.wa_notify) { await finish('cancelled', 'уведомления для клиента выключены'); continue }
      if (!eventStillTrue(n.event as NotifyEvent, s)) { await finish('cancelled', 'дата убрана до отправки'); continue }

      const { data: chat } = await supabase.from('crm_chats').select('id, external_id')
        .eq('client_id', s.client_id).order('last_message_at', { ascending: false }).limit(1).maybeSingle()
      const to = chat?.external_id || (client.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7')
      if (!to) { await finish('failed', 'у клиента нет номера WhatsApp'); continue }

      const built = buildNotification(n.event as NotifyEvent, s, client.name, !!client.is_russia, Date.now())
      if ('error' in built) { await finish('failed', built.error); continue }

      // Free-form text is only delivered within 24h of the client's last message; otherwise an approved template is required.
      const { data: lastIn } = chat
        ? await supabase.from('crm_messages').select('created_at').eq('chat_id', chat.id).eq('direction', 'in').order('created_at', { ascending: false }).limit(1).maybeSingle()
        : { data: null }
      const windowOpen = !!lastIn && Date.now() - new Date(lastIn.created_at).getTime() < 24 * 3600 * 1000
      if (windowOpen) await waSendText(to, built.text)
      else if (built.template) await waSendTemplate(to, built.template.name, TEMPLATE_LANGUAGE, built.template.params)
      else { await finish('failed', 'клиент не писал больше 24 часов, а шаблона для этого события нет'); continue }

      const chatId = chat?.id ?? (await supabase.from('crm_chats')
        .insert({ channel: 'whatsapp', external_id: to, name: client.name, phone: `+${to}`, client_id: s.client_id, unread_count: 0, greeted_at: new Date().toISOString() })
        .select('id').single()).data?.id
      if (chatId) {
        const { data: message } = await supabase.from('crm_messages')
          .insert({ chat_id: chatId, direction: 'out', text: built.text, shipment_id: n.shipment_id, sender_id: null }).select('created_at').single()
        await supabase.from('crm_chats').update({ last_message_text: built.text, last_message_at: message?.created_at ?? new Date().toISOString() }).eq('id', chatId)
      }
      sent++
    } catch (e) {
      await finish('failed', (e as Error).message.slice(0, 300))
    }
  }
  return Response.json({ due: due?.length ?? 0, sent })
}
