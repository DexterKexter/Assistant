import { after } from 'next/server'
import { generateText, stepCountIs, type ModelMessage } from 'ai'
import { createServiceClient } from '@/lib/crm'
import { openrouter, SYSTEM_PROMPT, agentTools } from '@/lib/agent-tools'

export const maxDuration = 60

type TgMessage = {
  chat: { id: number }
  from?: { id: number }
  text?: string
  reply_to_message?: { text?: string }
}

function tg(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function send(chatId: number, text: string) {
  // Telegram caps a message at 4096 chars.
  for (let i = 0; i < text.length; i += 4000) await tg('sendMessage', { chat_id: chatId, text: text.slice(i, i + 4000) })
}

async function answer(m: TgMessage) {
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
      system: SYSTEM_PROMPT + '\n\nТы отвечаешь в Telegram: только простой текст, без markdown, без таблиц. Изменять данные и строить графики здесь нельзя — для этого дашборд.',
      messages,
      stopWhen: stepCountIs(12),
      tools,
    })
    await send(m.chat.id, text || 'Не удалось получить ответ.')
  } catch (e) {
    console.error('telegram agent', e)
    await send(m.chat.id, 'Ошибка при обработке запроса. Попробуйте ещё раз.')
  }
}

export async function POST(req: Request) {
  // Set via setWebhook's secret_token; without it anyone could post fake updates.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  const m: TgMessage | undefined = (await req.json()).message
  if (m?.text && m.from) {
    // The bot is public and the tools bypass RLS, so only listed Telegram user ids get answers.
    const allowed = (process.env.TELEGRAM_ALLOWED_IDS ?? '').split(',').map((s) => s.trim())
    if (allowed.includes(String(m.from.id))) {
      // Telegram retries if the 200 is slow; the model runs after the response.
      after(() => answer(m))
    } else {
      await send(m.chat.id, `Нет доступа. Ваш Telegram ID: ${m.from.id}`)
    }
  }
  return Response.json({ ok: true })
}
