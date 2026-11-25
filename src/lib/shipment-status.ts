export type StatusShipment = {
  container_number: string | null
  origin: string | null
  destination_city: string | null
  destination_station: string | null
  departure_date: string | null
  arrival_date: string | null
  delivery_date: string | null
  is_completed: boolean | null
}

export const ruDate = (d: string) => d.split('-').reverse().join('.')
const ru = ruDate

// Same rules as CLAUDE.md "Логика статусов". One line, so it also fits a WhatsApp template parameter.
export function shipmentStatusLabel(s: StatusShipment, isRussia: boolean) {
  if (s.delivery_date || s.is_completed) return `Доставлен${s.delivery_date ? ` ${ru(s.delivery_date)}` : ''}`
  if (s.arrival_date) return `${isRussia ? 'Транзит КЗ' : 'На границе КЗ'}${s.destination_station ? `, ${s.destination_station}` : ''} с ${ru(s.arrival_date)}`
  if (s.departure_date) return `В пути с ${ru(s.departure_date)}`
  return 'Загрузка'
}

export function shipmentStatusText(s: StatusShipment, isRussia: boolean) {
  const route = [s.origin, s.destination_city].filter(Boolean).join(' → ')
  return `📦 Контейнер ${s.container_number || '—'}\n${route ? `Маршрут: ${route}\n` : ''}Статус: ${shipmentStatusLabel(s, isRussia)}`
}
