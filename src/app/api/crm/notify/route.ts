import { createServiceClient } from '@/lib/crm'
import { deliverNotification } from '@/lib/crm-notify'
import type { NotifyEvent } from '@/lib/shipment-notify'

// Called every minute by the database (pg_cron) when notifications are due.
// Deliberately takes no input and needs no secret: all it can do is drain the queue that the
// shipments trigger filled, and each row is claimed atomically, so extra calls are harmless.
export async function POST() {
  const supabase = createServiceClient()
  const { data: due } = await supabase.from('crm_notifications').select('id, event, shipment_id')
    .eq('status', 'pending').lte('send_after', new Date().toISOString()).order('send_after').limit(20)

  let sent = 0
  for (const n of due || []) {
    // Claim first: a concurrent run must not send the same message twice.
    const { data: claimed } = await supabase.from('crm_notifications').update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', n.id).eq('status', 'pending').select('id')
    if (!claimed?.length) continue
    const result = await deliverNotification(n.shipment_id, n.event as NotifyEvent, true)
    if (result.ok) sent++
    else await supabase.from('crm_notifications').update({ status: result.status, error: result.error, sent_at: null }).eq('id', n.id)
  }
  return Response.json({ due: due?.length ?? 0, sent })
}
