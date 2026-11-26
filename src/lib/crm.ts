import { createClient } from '@supabase/supabase-js'

// Server-only: bypasses RLS. Used by the messenger webhooks, which have no user session.
export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

// WhatsApp Cloud API (official). Free-form text only works within 24h of the client's last message.
export async function waSendText(to: string, body: string) {
  const res = await fetch(`https://graph.facebook.com/v26.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })
  const data = await res.json()
  if (data.error) {
    throw new Error(data.error.code === 131047
      ? 'Прошло больше 24 часов с последнего сообщения клиента — WhatsApp разрешает писать только шаблоном'
      : data.error.message)
  }
  return data
}

export async function waSendTemplate(to: string, name: string, language: string, params: string[]) {
  const res = await fetch(`https://graph.facebook.com/v26.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name, language: { code: language }, components: params.length ? [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }] : [] },
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.error_data?.details || data.error.message)
  return data
}

// Meta keeps media for ~30 days, so copy it into our bucket. Returns null on any failure: the text still gets saved.
async function waFetchMedia(id: string, folder: string) {
  try {
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    const meta = await (await fetch(`https://graph.facebook.com/v26.0/${id}`, { headers: auth })).json()
    if (!meta.url) return null
    const file = await fetch(meta.url, { headers: auth })
    if (!file.ok) return null
    const type = String(meta.mime_type || 'application/octet-stream').split(';')[0]
    const path = `${folder}/${id}.${type.split('/')[1] || 'bin'}`
    const { error } = await createServiceClient().storage.from('crm-media').upload(path, await file.arrayBuffer(), { contentType: type, upsert: true })
    return error ? null : { path, type }
  } catch {
    return null
  }
}

// Sent once to a number we have never talked to. Free-form text is allowed: the client has just written, so the 24h window is open.
const GREETING = `Здравствуйте! 👋 Это *STI Logistics* — контейнерные перевозки по всему миру.

Чтобы быстрее посчитать перевозку, напишите:
📍 откуда и куда
📦 что везёте
📏 контейнер 20 или 40 ft

Менеджер ответит в ближайшее время.`

export const phoneDigits = (p: string | null | undefined) => (p || '').replace(/\D/g, '').slice(-10)

type Inbound = {
  channel: 'whatsapp'
  externalId: string
  name: string
  username?: string | null
  phone?: string | null
  text: string
  mediaId?: string
}

// Upserts the chat (auto-linking a client by phone), stores the incoming message, greets a new contact. Returns the chat id.
export async function saveInbound(m: Inbound) {
  const supabase = createServiceClient()
  const { data: existing } = await supabase.from('crm_chats').select('id, unread_count, client_id, greeted_at')
    .eq('channel', m.channel).eq('external_id', m.externalId).maybeSingle()

  const patch: Record<string, unknown> = { name: m.name, last_message_text: m.text, last_message_at: new Date().toISOString() }
  if (m.username !== undefined) patch.username = m.username
  if (m.phone) {
    patch.phone = m.phone
    if (!existing?.client_id) {
      // ponytail: full scan of ~200 clients, fine until thousands
      const { data: clients } = await supabase.from('clients').select('id, phone').not('phone', 'is', null)
      const match = clients?.find(c => phoneDigits(c.phone).length === 10 && phoneDigits(c.phone) === phoneDigits(m.phone))
      if (match) patch.client_id = match.id
    }
  }

  const { data: chat, error } = existing
    ? await supabase.from('crm_chats').update({ ...patch, unread_count: existing.unread_count + 1 }).eq('id', existing.id).select('id').single()
    // A number that matched an existing client is not a new contact: mark it greeted without sending anything.
    : await supabase.from('crm_chats').insert({ ...patch, channel: m.channel, external_id: m.externalId, unread_count: 1, greeted_at: patch.client_id ? new Date().toISOString() : null }).select('id').single()
  if (error) throw error

  const media = m.mediaId ? await waFetchMedia(m.mediaId, chat.id) : null
  await supabase.from('crm_messages').insert({ chat_id: chat.id, direction: 'in', text: m.text, sender_id: null, media_path: media?.path ?? null, media_type: media?.type ?? null })

  if (existing ? !existing.greeted_at : !patch.client_id) {
    // Claim the greeting first so a burst of first messages cannot send it twice.
    const { data: claimed } = await supabase.from('crm_chats').update({ greeted_at: new Date().toISOString() }).eq('id', chat.id).is('greeted_at', null).select('id')
    if (claimed?.length) {
      try {
        await waSendText(m.externalId, GREETING)
        await supabase.from('crm_messages').insert({ chat_id: chat.id, direction: 'out', text: GREETING, sender_id: null })
      } catch (e) {
        console.error('greeting failed', e)
      }
    }
  }
  return chat.id as string
}
