import { TEMPLATES, compileTemplate, fillTemplate, type TemplateName } from '@/lib/whatsapp-template'
import { templateValues } from '@/lib/template-values'
import type { StatusShipment } from '@/lib/shipment-status'

export type NotifyEvent = 'created' | 'departed' | 'border' | 'delivered'

const EVENT_TEMPLATE: Partial<Record<NotifyEvent, TemplateName>> = {
  departed: 'shipment_departed', border: 'shipment_at_border', delivered: 'shipment_delivered',
}

// The date may have been cleared during the 10-minute delay: then there is nothing to announce.
export function eventStillTrue(event: NotifyEvent, s: StatusShipment) {
  if (event === 'departed') return !!s.departure_date
  if (event === 'border') return !!s.arrival_date
  if (event === 'delivered') return !!s.delivery_date || !!s.is_completed
  return true
}

// What to send for an event. `text` is always set (free-form, usable inside the 24h window);
// `template` is set when an approved-template fallback exists for use outside it.
export function buildNotification(event: NotifyEvent, s: StatusShipment, clientName: string, isRussia: boolean, now: number):
  { text: string; template?: { name: TemplateName; params: string[] } } | { error: string } {
  if (event === 'created') {
    const route = [s.origin, s.destination_city].filter(Boolean).join(' → ')
    return {
      text: `📋 *Перевозка оформлена*\n\nЗдравствуйте, ${clientName}!\n\n`
        + (route ? `🗺 Маршрут: *${route}*\n` : '')
        + (s.container_number ? `📦 Контейнер: *${s.container_number}*\n` : '')
        + `\nСообщим, когда контейнер будет отправлен 🚢`,
    }
  }
  const name = EVENT_TEMPLATE[event]!
  const { body, fields } = compileTemplate(TEMPLATES.find(t => t.name === name)!.text)
  const values = templateValues(clientName, s, isRussia, now)
  const params = fields.map(f => (values[f] || '').trim())
  const missing = fields.find((_, i) => !params[i])
  if (missing) return { error: `нет данных для поля «${missing}»` }
  // ponytail: templates in Meta still carry the old brand until their review ends; free-form text can use the new one now.
  return { text: fillTemplate(body, params).replaceAll('STI Cargo', 'STI Logistics'), template: { name, params } }
}
