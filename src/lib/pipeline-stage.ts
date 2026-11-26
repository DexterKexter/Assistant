// A shipment's pipeline column is derived from its dates; the furthest filled date wins.
export const STAGES = ['loading', 'export', 'transit', 'border', 'customs', 'delivered'] as const
export type Stage = (typeof STAGES)[number]

const DATE = { export: 'export_date', transit: 'departure_date', border: 'arrival_date', customs: 'customs_date', delivered: 'delivery_date' } as const
type Dates = { [K in (typeof DATE)[keyof typeof DATE]]?: string | null } & { is_completed?: boolean | null }

export function stageOf(s: Dates): Stage {
  if (s.delivery_date || s.is_completed) return 'delivered'
  if (s.customs_date) return 'customs'
  if (s.arrival_date) return 'border'
  if (s.departure_date) return 'transit'
  return s.export_date ? 'export' : 'loading'
}

// Forward: stamp the target stage with today (skipped stages stay empty — export and customs are optional).
// Back: clear every date after the target, so the card lands exactly there.
export function movePatch(from: Stage, to: Stage, today: string): Record<string, string | boolean | null> {
  const a = STAGES.indexOf(from), b = STAGES.indexOf(to)
  if (a === b) return {}
  if (b > a) return { [DATE[to as keyof typeof DATE]]: today }
  const patch: Record<string, string | boolean | null> = { is_completed: false }
  for (const st of STAGES.slice(b + 1)) patch[DATE[st as keyof typeof DATE]] = null
  return patch
}
