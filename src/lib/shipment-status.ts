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

const ru = (d: string) => d.split('-').reverse().join('.')

// Same rules as CLAUDE.md "Логика статусов".
export function shipmentStatusText(s: StatusShipment, isRussia: boolean) {
  const route = [s.origin, s.destination_city].filter(Boolean).join(' → ')
  let status = 'Загрузка'
  if (s.delivery_date || s.is_completed) status = `Доставлен${s.delivery_date ? ` ${ru(s.delivery_date)}` : ''}`
  else if (s.arrival_date) status = `${isRussia ? 'Транзит КЗ' : 'На границе КЗ'}${s.destination_station ? `, ${s.destination_station}` : ''} с ${ru(s.arrival_date)}`
  else if (s.departure_date) status = `В пути с ${ru(s.departure_date)}`
  return `📦 Контейнер ${s.container_number || '—'}\n${route ? `Маршрут: ${route}\n` : ''}Статус: ${status}`
}
