import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/crm'
import { deliverNotification } from '@/lib/crm-notify'
import { currentEvent } from '@/lib/shipment-notify'

// The "send notification" button on a shipment: tells the client its current stage right now.
export async function POST(req: Request) {
  const { shipmentId } = await req.json().catch(() => ({}))
  if (typeof shipmentId !== 'string') return new Response('bad request', { status: 400 })

  const supabase = await createClient()
  const { data: role } = await supabase.rpc('get_user_role')
  if (role !== 'admin' && role !== 'manager') return new Response('forbidden', { status: 403 })

  const { data: s } = await supabase.from('shipments').select('departure_date, arrival_date, delivery_date, is_completed').eq('id', shipmentId).maybeSingle()
  if (!s) return new Response('Перевозка не найдена', { status: 404 })

  const event = currentEvent(s)
  const result = await deliverNotification(shipmentId, event, false)
  if (!result.ok) return new Response(result.error, { status: 422 })

  // Mark the stage as announced so the automatic queue does not repeat it.
  await createServiceClient().from('crm_notifications')
    .upsert({ shipment_id: shipmentId, event, status: 'sent', send_after: new Date().toISOString(), sent_at: new Date().toISOString(), error: null }, { onConflict: 'shipment_id,event' })
  return Response.json({ event })
}
