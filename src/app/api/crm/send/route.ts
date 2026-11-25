import { createClient } from '@/lib/supabase/server'
import { waSendText, waSendTemplate } from '@/lib/crm'
import { TEMPLATES, TEMPLATE_FIELDS, TEMPLATE_LANGUAGE, compileTemplate, fillTemplate } from '@/lib/whatsapp-template'
import { templateValues } from '@/lib/template-values'

export async function POST(req: Request) {
  const { chatId, text, shipmentId, template } = await req.json()
  if (!chatId || (!template && (typeof text !== 'string' || !text.trim()))) return new Response('bad request', { status: 400 })

  // User-session client: RLS lets only admin/manager see crm_chats.
  const supabase = await createClient()
  const { data: chat } = await supabase.from('crm_chats').select('id, external_id, name, client_id').eq('id', chatId).maybeSingle()
  if (!chat) return new Response('not found', { status: 404 })

  let sent: string = text
  try {
    if (template) {
      const tpl = TEMPLATES.find(t => t.name === template)
      if (!tpl) return new Response('Шаблон не найден', { status: 404 })
      const { body, fields } = compileTemplate(tpl.text)

      const [{ data: client }, { data: shipment }] = await Promise.all([
        chat.client_id ? supabase.from('clients').select('name, is_russia').eq('id', chat.client_id).maybeSingle() : { data: null },
        shipmentId && chat.client_id
          ? supabase.from('shipments')
              .select('container_number, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, is_completed')
              .eq('id', shipmentId).eq('client_id', chat.client_id).maybeSingle()
          : { data: null },
      ])
      if (!shipment && fields.some(f => TEMPLATE_FIELDS[f]?.needsShipment)) return new Response('Выберите контейнер клиента для этого шаблона', { status: 400 })

      const value = templateValues(client?.name || chat.name, shipment, !!client?.is_russia, Date.now())
      const params = fields.map(f => (value[f] || '').trim())
      const missing = fields.find((f, i) => !params[i])
      if (missing) return new Response(`Нет данных для поля «${TEMPLATE_FIELDS[missing]?.label || missing}»`, { status: 400 })

      await waSendTemplate(chat.external_id, tpl.name, TEMPLATE_LANGUAGE, params)
      sent = fillTemplate(body, params)
    } else {
      await waSendText(chat.external_id, text)
    }
  } catch (e) {
    return new Response((e as Error).message, { status: 502 })
  }

  const { data: message, error } = await supabase.from('crm_messages')
    .insert({ chat_id: chat.id, direction: 'out', text: sent, shipment_id: shipmentId ?? null }).select().single()
  if (error) return new Response(error.message, { status: 500 })
  await supabase.from('crm_chats').update({ last_message_text: sent, last_message_at: message.created_at }).eq('id', chat.id)

  return Response.json(message)
}
