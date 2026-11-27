import { after } from 'next/server'
import { generateText, stepCountIs, type ModelMessage } from 'ai'
import { createServiceClient } from '@/lib/crm'
import { openrouter, SYSTEM_PROMPT, agentTools } from '@/lib/agent-tools'
import { tg, tgSend, userIdFromLinkToken } from '@/lib/telegram'

export const maxDuration = 60

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
  reply_to_message?: { message_id: number; text?: string }
}

async function answer(m: TgMessage, managerName: string | null) {
  await tg('sendChatAction', { chat_id: m.chat.id, action: 'typing' })
  // ponytail: no stored history — context is only the message being replied to. Add a table if multi-turn matters.
  const messages: ModelMessage[] = [
    ...(m.reply_to_message?.text ? [{ role: 'assistant' as const, content: m.reply_to_message.text }] : []),
    { role: 'user', content: m.text! },
  ]
  // ponytail: read-only in Telegram — no create/update tools (no confirmation UI) and no charts.
  const { create_shipment, update_shipment, create_client, create_carrier, render_chart, ...tools } =
    agentTools(createServiceClient())
  try {
    const { text } = await generateText({
      model: openrouter.chat('deepseek/deepseek-v4.1-flash'),
      system: SYSTEM_PROMPT + `\n\nТы отвечаешь в Telegram: только простой текст, без markdown, без таблиц. Изменять данные и строить графики здесь нельзя — для этого дашборд.${managerName ? ` Тебе пишет сотрудник: ${managerName}.` : ''}`,
      messages,
      stopWhen: stepCountIs(12),
      tools,
    })
    await tgSend(m.chat.id, text || 'Не удалось получить ответ.')
  } catch (e) {
    console.error('telegram agent', e)
    await tgSend(m.chat.id, 'Ошибка при обработке запроса. Попробуйте ещё раз.')
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

  const m: TgMessage | undefined = (await req.json()).message
  if (!m?.from) return Response.json({ ok: true })
  const db = createServiceClient()
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
        // Telegram retries if the 200 is slow; the model runs after the response.
        after(() => answer(m, profile.full_name))
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
