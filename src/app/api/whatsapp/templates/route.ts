import { createClient } from '@/lib/supabase/server'
import { TEMPLATES, templatePayload, type TemplateName } from '@/lib/whatsapp-template'

// Templates are written in code (lib/whatsapp-template.ts); this route only asks Meta for their
// approval status and submits one for approval.
async function graph(path: string, init?: RequestInit) {
  const { WHATSAPP_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID } = process.env
  if (!WHATSAPP_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
    return Response.json({ error: 'WhatsApp ещё не подключён: добавьте WHATSAPP_TOKEN и WHATSAPP_BUSINESS_ACCOUNT_ID' }, { status: 503 })
  }
  const res = await fetch(`https://graph.facebook.com/v26.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  })
  const data = await res.json()
  if (data.error) return Response.json({ error: data.error.error_user_msg || data.error.message }, { status: 502 })
  return Response.json(data)
}

async function forbidden() {
  const supabase = await createClient()
  const { data: role } = await supabase.rpc('get_user_role')
  return role === 'admin' || role === 'manager' ? null : new Response('forbidden', { status: 403 })
}

export async function GET() {
  return (await forbidden()) ?? graph('?fields=name,status,rejected_reason&limit=200')
}

export async function POST(req: Request) {
  const denied = await forbidden()
  if (denied) return denied
  const { name } = await req.json()
  if (!TEMPLATES.some(t => t.name === name)) return Response.json({ error: 'Неизвестный шаблон' }, { status: 400 })
  return graph('', { method: 'POST', body: JSON.stringify(templatePayload(name as TemplateName)) })
}
