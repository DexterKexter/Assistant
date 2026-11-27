import { createHmac, timingSafeEqual } from 'node:crypto'

export const BOT_USERNAME = 'sti_log_bot'

export function tg(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function tgSend(chatId: number, text: string) {
  // Telegram caps a message at 4096 chars.
  for (let i = 0; i < text.length; i += 4000) await tg('sendMessage', { chat_id: chatId, text: text.slice(i, i + 4000) })
}

// HTML message (only <b> is used); `editId` rewrites an existing message instead of sending a new one.
// If Telegram rejects the markup, the same text goes out plain rather than not at all.
export async function tgHtml(chatId: number, html: string, editId?: number) {
  const method = editId ? 'editMessageText' : 'sendMessage'
  const res = await tg(method, { chat_id: chatId, message_id: editId, text: html, parse_mode: 'HTML' })
  if (!res.ok) {
    const plain = html.replace(/<\/?b>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    await tg(method, { chat_id: chatId, message_id: editId, text: plain })
  }
}

export async function tgSendFile(chatId: number, name: string, bytes: Uint8Array) {
  const form = new FormData()
  form.set('chat_id', String(chatId))
  form.set('document', new Blob([bytes as BlobPart]), name)
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: form })
}

// Account-link token for t.me/<bot>?start=<token>: user id + expiry, signed, so no table is needed.
// 20 bytes payload -> 27 base64url chars, + 22 chars of HMAC = 49 (Telegram allows 64).
const sign = (payload: string) =>
  createHmac('sha256', process.env.TELEGRAM_WEBHOOK_SECRET!).update(payload).digest('base64url').slice(0, 22)

export function linkToken(userId: string, ttlSeconds = 600) {
  const expires = Math.floor(Date.now() / 1000 + ttlSeconds).toString(16).padStart(8, '0')
  const payload = Buffer.from(userId.replace(/-/g, '') + expires, 'hex').toString('base64url')
  return payload + sign(payload)
}

export function userIdFromLinkToken(token: string): string | null {
  const payload = token.slice(0, 27)
  const given = Buffer.from(token.slice(27))
  const expected = Buffer.from(sign(payload))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  const hex = Buffer.from(payload, 'base64url').toString('hex')
  if (parseInt(hex.slice(32), 16) < Date.now() / 1000) return null
  return hex.slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}
