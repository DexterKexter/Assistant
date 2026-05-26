import type { Shipment } from '@/types/database'

export type TransshipmentPosition = 'before_border' | 'after_border'

export type RouteLegKind = 'origin' | 'transshipment' | 'border' | 'delivery'

export interface RouteLeg {
  kind: RouteLegKind
  label: string
  location: string | null
  date: string | null
  dateField?: 'departure_date' | 'transshipment_date' | 'arrival_date' | 'delivery_date'
  transshipmentPosition?: TransshipmentPosition
}

export function hasTransshipment(s: Pick<Shipment, 'transshipment_location'>): boolean {
  return !!(s.transshipment_location?.trim())
}

/** Позиция перевалки; старые записи без поля считаем «до границы». */
export function getTransshipmentPosition(
  s: Pick<Shipment, 'transshipment_location' | 'transshipment_position'>,
): TransshipmentPosition | null {
  if (!hasTransshipment(s)) return null
  const p = s.transshipment_position
  if (p === 'before_border' || p === 'after_border') return p
  return 'before_border'
}

export function transshipmentPositionLabel(pos: TransshipmentPosition): string {
  return pos === 'before_border' ? 'до границы' : 'после границы'
}

export function getOrderedRouteLegs(
  s: Pick<
    Shipment,
    | 'origin'
    | 'transshipment_location'
    | 'transshipment_date'
    | 'transshipment_position'
    | 'destination_station'
    | 'destination_city'
    | 'departure_date'
    | 'arrival_date'
    | 'delivery_date'
  >,
): RouteLeg[] {
  const legs: RouteLeg[] = [
    {
      kind: 'origin',
      label: 'Загрузка',
      location: s.origin,
      date: s.departure_date,
      dateField: 'departure_date',
    },
  ]

  const transPos = getTransshipmentPosition(s)
  if (transPos === 'before_border') {
    legs.push({
      kind: 'transshipment',
      label: 'Перевалка',
      location: s.transshipment_location,
      date: s.transshipment_date,
      dateField: 'transshipment_date',
      transshipmentPosition: 'before_border',
    })
  }

  legs.push({
    kind: 'border',
    label: 'Граница',
    location: s.destination_station,
    date: s.arrival_date,
    dateField: 'arrival_date',
  })

  if (transPos === 'after_border') {
    legs.push({
      kind: 'transshipment',
      label: 'Перевалка',
      location: s.transshipment_location,
      date: s.transshipment_date,
      dateField: 'transshipment_date',
      transshipmentPosition: 'after_border',
    })
  }

  legs.push({
    kind: 'delivery',
    label: 'Доставка',
    location: s.destination_city,
    date: s.delivery_date,
    dateField: 'delivery_date',
  })

  return legs
}
