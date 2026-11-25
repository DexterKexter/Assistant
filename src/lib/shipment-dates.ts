import { addDays, format, isMatch, startOfMonth, startOfWeek } from 'date-fns'

export type ShipmentDateField = 'departure_date' | 'arrival_date' | 'delivery_date'
export type ShipmentDates = Record<ShipmentDateField, string | null>

export function shipmentDateBounds(field: ShipmentDateField, dates: ShipmentDates) {
  const earlier = field === 'departure_date' ? [] : field === 'arrival_date' ? [dates.departure_date] : [dates.departure_date, dates.arrival_date]
  const later = field === 'delivery_date' ? [] : field === 'arrival_date' ? [dates.delivery_date] : [dates.arrival_date, dates.delivery_date]
  return {
    min: earlier.filter((date): date is string => !!date).sort().at(-1),
    max: later.filter((date): date is string => !!date).sort()[0],
  }
}

export function shipmentDateError(value: string, bounds: { min?: string; max?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isMatch(value, 'yyyy-MM-dd')) return 'Выберите корректную дату.'
  const display = (date: string) => date.split('-').reverse().join('.')
  if (bounds.min && value < bounds.min) return `Дата не может быть раньше ${display(bounds.min)} — предыдущего этапа.`
  if (bounds.max && value > bounds.max) return `Дата не может быть позже ${display(bounds.max)} — следующего этапа.`
  return null
}

export function shipmentCalendarDays(month: Date) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  return Array.from({ length: 42 }, (_, index) => format(addDays(first, index), 'yyyy-MM-dd'))
}
