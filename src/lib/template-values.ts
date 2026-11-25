import { ruDate, shipmentStatusLabel, type StatusShipment } from '@/lib/shipment-status'
import type { TemplateField } from '@/lib/whatsapp-template'

// Days from departure to delivery, or to `now` while the container is still on its way.
export function daysInTransit(s: StatusShipment, now: number) {
  if (!s.departure_date) return null
  const end = s.delivery_date ? new Date(s.delivery_date).getTime() : now
  return Math.max(0, Math.round((end - new Date(s.departure_date).getTime()) / 86400000))
}

// What the CRM puts into each template field. Used for the chat preview and for the real send.
export function templateValues(clientName: string, shipment: StatusShipment | null | undefined, isRussia: boolean, now: number): Record<TemplateField, string | null | undefined> {
  return {
    client_name: clientName,
    container: shipment?.container_number,
    status: shipment && shipmentStatusLabel(shipment, isRussia),
    route: shipment && [shipment.origin, shipment.destination_city].filter(Boolean).join(' → '),
    arrival_date: shipment?.arrival_date && ruDate(shipment.arrival_date),
    city: shipment?.destination_city,
    days: shipment && daysInTransit(shipment, now)?.toString(),
  }
}
