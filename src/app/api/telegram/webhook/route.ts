import { saveInbound, tg } from '@/lib/crm'

type TgMessage = {
  chat: { id: number; type: string }
  from?: { first_name?: string; last_name?: string; username?: string }
  text?: string
  caption?: string
  photo?: unknown
  document?: { file_name?: string }
  contact?: { phone_number: string }
}

export async function POST(req: Request) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }
  const update = await req.json()
  const msg: TgMessage | undefined = update.message
  if (!msg || msg.chat.type !== 'private') return Response.json({ ok: true })

  await saveInbound({
    channel: 'telegram',
    externalId: String(msg.chat.id),
    name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' '),
    username: msg.from?.username ?? null,
    phone: msg.contact?.phone_number,
    text: msg.contact ? `📱 ${msg.contact.phone_number}`
      : msg.text ?? msg.caption ?? (msg.photo ? '[фото]' : msg.document ? `[файл ${msg.document.file_name ?? ''}]` : '[сообщение]'),
  })

  if (msg.text?.startsWith('/start')) {
    await tg('sendMessage', {
      chat_id: msg.chat.id,
      text: 'Здравствуйте! Напишите ваш вопрос — менеджер ответит здесь. Чтобы мы нашли ваши контейнеры, поделитесь номером телефона 👇',
      reply_markup: { keyboard: [[{ text: 'Поделиться номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    })
  } else if (msg.contact) {
    await tg('sendMessage', { chat_id: msg.chat.id, text: 'Спасибо! Номер получен.', reply_markup: { remove_keyboard: true } })
  }

  return Response.json({ ok: true })
}
