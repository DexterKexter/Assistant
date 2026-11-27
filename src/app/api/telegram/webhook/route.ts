import { after } from 'next/server'
import { createServiceClient } from '@/lib/crm'
import { ask, telegramHtml, type Turn } from '@/lib/telegram-assistant'
import { tg, tgHtml, tgSend, tgSendFile, userIdFromLinkToken } from '@/lib/telegram'

export const maxDuration = 300

type TgFile = { file_id: string }
type TgMessage = {
  message_id: number
  date: number
  chat: { id: number; type: string }
  from?: { id: number; first_name?: string; last_name?: string }
  text?: string
  caption?: string
  photo?: TgFile[]
  document?: TgFile
  video?: TgFile
  voice?: TgFile
  audio?: TgFile
  reply_to_message?: { message_id: number }
}

// The assistant remembers the last 10 turns of the last 2 hours; "/new" starts over.
const TALK_MS = 2 * 60 * 60 * 1000
const NEW_TALK = /^(\/new|новый разговор|забудь)/i

// Runs after the 200: the model can think for a minute, and Telegram would resend the update meanwhile.
async function answer(m: TgMessage, profile: { full_name: string | null; role: string }) {
  const db = createServiceClient()
  const chat = m.chat.id
  const wait: number | undefined = (await (await tg('sendMessage', { chat_id: chat, text: '🤔 Думаю…' })).json()).result?.message_id
  const say = async (text: string) => {
    const [first, ...rest] = telegramHtml(text)
    await tgHtml(chat, first, wait)
    for (const part of rest) await tgHtml(chat, part)
  }
  try {
    const { data: past } = await db.from('telegram_assistant_turns').select('role, content')
      .eq('chat_id', chat).gte('created_at', new Date(Date.now() - TALK_MS).toISOString())
      .order('id', { ascending: false }).limit(10)
    const history = [...((past ?? []) as Turn[])].reverse()
    // A conversation has to start with the user's turn.
    while (history[0]?.role === 'assistant') history.shift()
    const res = await ask(db, profile, [...history, { role: 'user', content: m.text! }])
    await say(res.answer)
    await db.from('telegram_assistant_turns').insert([
      { chat_id: chat, role: 'user', content: m.text! },
      { chat_id: chat, role: 'assistant', content: res.answer },
    ])
    for (const f of res.files) await tgSendFile(chat, f.name, f.bytes)
  } catch (e) {
    console.error('telegram assistant', e)
    await say('⚠️ Ассистент сейчас не ответил. Попробуйте ещё раз.')
  }
}

// `/start <token>` from the dashboard's "link Telegram" button.
async function linkAccount(m: TgMessage, token: string) {
  const userId = userIdFromLinkToken(token)
  if (!userId) return tgSend(m.chat.id, 'Ссылка устарела. Нажмите «Привязать Telegram» на сайте ещё раз.')
  const db = createServiceClient()
  // One Telegram account ↔ one profile: relinking moves it.
  await db.from('profiles').update({ telegram_id: null }).eq('telegram_id', m.from!.id)
  const { data } = await db.from('profiles').update({ telegram_id: m.from!.id }).eq('id', userId).select('full_name').single()
  return tgSend(m.chat.id, data ? `Готово, Telegram привязан к аккаунту ${data.full_name ?? ''}. Можете задавать вопросы по базе.` : 'Не удалось привязать аккаунт.')
}

export async function POST(req: Request) {
  // Set via setWebhook's secret_token; without it anyone could post fake updates.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  const update = await req.json()
  const db = createServiceClient()

  // "Accepted" button under a request the bot posted to a carrier group.
  // Two steps so a stray tap confirms nothing: accept -> "Yes, confirm" / "Cancel", and only the same person can confirm.
  const cb: { id: string; data?: string; from: { id: number; first_name?: string; last_name?: string }; message?: { message_id: number; chat: { id: number } } } | undefined = update.callback_query
  if (cb?.message) {
    const at = { chat_id: cb.message.chat.id, message_id: cb.message.message_id }
    const buttons = (...row: [string, string][]) => ({ inline_keyboard: [row.map(([text, callback_data]) => ({ text, callback_data }))] })
    const by = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(' ')
    const { data: request } = await db.from('cargo_requests').select('id, carrier_accepted_at')
      .eq('carrier_chat_id', at.chat_id).eq('carrier_message_id', at.message_id).maybeSingle()
    let notice = ''
    if (!request) notice = 'Request not found'
    else if (request.carrier_accepted_at) notice = 'Already accepted'
    else if (cb.data === 'accept') {
      notice = 'Press “Yes, confirm” to accept'
      await tg('editMessageReplyMarkup', { ...at, reply_markup: buttons(['✅ Yes, confirm', `confirm:${cb.from.id}`], ['✖ Cancel', 'cancel']) })
    } else if (cb.data === 'cancel') {
      await tg('editMessageReplyMarkup', { ...at, reply_markup: buttons(['✅ Accepted', 'accept']) })
    } else if (cb.data === `confirm:${cb.from.id}`) {
      // `is null` makes it first-confirm-wins.
      await db.from('cargo_requests').update({ carrier_accepted_at: new Date().toISOString(), carrier_accepted_by: by })
        .eq('id', request.id).is('carrier_accepted_at', null)
      notice = 'Accepted, thank you!'
      await tg('editMessageReplyMarkup', { ...at, reply_markup: buttons([`✅ Accepted by ${by}`, 'accept']) })
    } else notice = 'Only the person who pressed “Accepted” can confirm'
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: notice })
    return Response.json({ ok: true })
  }

  const m: TgMessage | undefined = update.message
  if (!m?.from) return Response.json({ ok: true })
  const author = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ')

  if (m.chat.type !== 'private') {
    // Archive of carrier-group chatter. Needs the bot's privacy mode off, otherwise only replies to the bot arrive.
    // Files are kept as Telegram file_id (largest photo size is last), not downloaded.
    await db.from('telegram_messages').upsert({
      chat_id: m.chat.id, message_id: m.message_id, from_id: m.from.id, from_name: author,
      text: m.text ?? m.caption ?? null,
      file_id: (m.photo?.at(-1) ?? m.document ?? m.video ?? m.voice ?? m.audio)?.file_id ?? null,
      reply_to_message_id: m.reply_to_message?.message_id ?? null,
      sent_at: new Date(m.date * 1000).toISOString(),
    }, { onConflict: 'chat_id,message_id', ignoreDuplicates: true })
  }
  if (!m.text) return Response.json({ ok: true })

  if (m.chat.type === 'private') {
    const start = m.text.match(/^\/start (\S+)$/)
    if (start) {
      await linkAccount(m, start[1])
    } else {
      // The bot is public and the tools bypass RLS, so only linked admins/managers get answers.
      const { data: profile } = await db.from('profiles').select('full_name, role').eq('telegram_id', m.from.id).maybeSingle()
      if (profile && ['admin', 'manager'].includes(profile.role)) {
        if (NEW_TALK.test(m.text)) {
          await db.from('telegram_assistant_turns').delete().eq('chat_id', m.chat.id)
          await tgSend(m.chat.id, '🆕 Начали разговор заново — прошлые вопросы забыл.')
        } else after(() => answer(m, profile))
      } else {
        await tgSend(m.chat.id, 'Бот доступен сотрудникам STI Logistics. Войдите в дашборд и нажмите «Привязать Telegram» в шапке сайта.')
      }
    }
  } else if (m.reply_to_message) {
    // Carrier group: keep replies to a request the bot posted there. Everything else in groups is ignored.
    // ponytail: text replies only; photos/files in the thread are not stored.
    const { data: request } = await db.from('cargo_requests').select('id')
      .eq('carrier_chat_id', m.chat.id).eq('carrier_message_id', m.reply_to_message.message_id).maybeSingle()
    if (request) {
      await db.from('cargo_request_replies').insert({
        request_id: request.id,
        author,
        text: m.text,
      })
    }
  }
  return Response.json({ ok: true })
}
