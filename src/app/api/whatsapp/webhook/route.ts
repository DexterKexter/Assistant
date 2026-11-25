import { createHmac, timingSafeEqual } from 'node:crypto'
import { saveInbound } from '@/lib/crm'

type WaMessage = {
  from: string
  type: string
  text?: { body: string }
  image?: { caption?: string }
  video?: { caption?: string }
  document?: { filename?: string; caption?: string }
  location?: { latitude: number; longitude: number }
  button?: { text: string }
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } }
}

// Meta calls this once when the webhook is configured in the app dashboard.
export function GET(req: Request) {
  const p = new URL(req.url).searchParams
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get('hub.challenge'))
  }
  return new Response('forbidden', { status: 403 })
}

function validSignature(raw: string, header: string | null) {
  if (!header || !process.env.WHATSAPP_APP_SECRET) return false
  const expected = 'sha256=' + createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(raw).digest('hex')
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

function messageText(m: WaMessage) {
  return m.text?.body
    ?? m.button?.text
    ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title
    ?? (m.image ? `[фото]${m.image.caption ? ` ${m.image.caption}` : ''}` : null)
    ?? (m.video ? `[видео]${m.video.caption ? ` ${m.video.caption}` : ''}` : null)
    ?? (m.document ? `[файл ${m.document.filename ?? ''}]${m.document.caption ? ` ${m.document.caption}` : ''}` : null)
    ?? (m.location ? `[геолокация ${m.location.latitude}, ${m.location.longitude}]` : null)
    ?? (m.type === 'audio' ? '[голосовое]' : `[${m.type}]`)
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) return new Response('forbidden', { status: 403 })

  const body = JSON.parse(raw)
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      // `statuses` (sent/delivered/read) arrive here too; we only store incoming messages.
      for (const m of (value?.messages ?? []) as WaMessage[]) {
        const contact = value.contacts?.find((c: { wa_id: string }) => c.wa_id === m.from)
        await saveInbound({
          channel: 'whatsapp',
          externalId: m.from,
          name: contact?.profile?.name ?? '',
          phone: `+${m.from}`,
          text: messageText(m),
        })
      }
    }
  }
  return Response.json({ ok: true })
}
