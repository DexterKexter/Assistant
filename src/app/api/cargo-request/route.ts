import { createServiceClient } from '@/lib/crm'

// Public endpoint behind the landing-page form: no session, so everything is validated here.
// ponytail: honeypot only; add Vercel BotID / rate limit if spam shows up.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  if (!b || b.website) return Response.json({ ok: true })

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const client_name = str(b.name, 120)
  const phone = str(b.phone, 40)
  const origin = str(b.origin, 160)
  const destination = str(b.destination, 160)
  if (!client_name || phone.replace(/\D/g, '').length < 10 || !origin || !destination) {
    return new Response('bad request', { status: 400 })
  }

  const { error } = await createServiceClient().from('cargo_requests').insert({
    client_name, phone, origin, destination,
    container_size: b.size === 20 ? 20 : 40,
    notes: str(b.notes, 3000),
    status: 'submitted',
  })
  if (error) return new Response('server error', { status: 500 })
  return Response.json({ ok: true })
}
