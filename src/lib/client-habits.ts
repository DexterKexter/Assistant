// What a client usually ships, from their past shipments: the manager gets it as one-click presets in the request form.
export type HabitRow = {
  origin: string | null; destination_city: string | null; container_size: number | string | null
  container_type: string | null; cargo_description: string | null; sender_name: string | null
}
export type Habit = { origin: string; destination: string; count: number; size: number | null; type: string; cargo: string; sender: string }

// Most frequent non-empty value; ties go to the one seen first (rows come newest first).
function mode(values: (string | null | undefined)[]): string {
  const counts = new Map<string, number>()
  for (const v of values) if (v?.trim()) counts.set(v.trim(), (counts.get(v.trim()) || 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

// Top routes by number of shipments; size, type, cargo and sender are the most common ones on that route.
export function clientHabits(rows: HabitRow[], limit = 3): Habit[] {
  const routes = new Map<string, HabitRow[]>()
  for (const r of rows) {
    if (!r.origin?.trim() || !r.destination_city?.trim()) continue
    const key = `${r.origin.trim()}\n${r.destination_city.trim()}`
    routes.set(key, [...(routes.get(key) || []), r])
  }
  return [...routes].sort((a, b) => b[1].length - a[1].length).slice(0, limit).map(([key, list]) => {
    const [origin, destination] = key.split('\n')
    return {
      origin, destination, count: list.length,
      size: Number(mode(list.map(r => r.container_size == null ? null : String(r.container_size)))) || null,
      type: mode(list.map(r => r.container_type)), cargo: mode(list.map(r => r.cargo_description)), sender: mode(list.map(r => r.sender_name)),
    }
  })
}
