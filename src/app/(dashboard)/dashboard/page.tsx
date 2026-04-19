import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type Shipment } from '@/types/database'
import { DashboardView, type DashboardData } from './dashboard-view'

export const dynamic = 'force-dynamic'

interface StatsResult {
  counts: {
    cur_loaded: number
    cur_delivered: number
    prev_loaded: number
    prev_delivered: number
    in_transit: number
    on_border: number
  }
  topCarriers: { name: string; cnt: number }[]
  topRoutes: { route: string; cnt: number }[]
  mapPoints: { origin: string | null; destination_city: string | null; destination_station: string | null }[]
}

const getDashboardPayload = unstable_cache(
  async () => {
    const supabase = await createClient()
    const [statsRes, activeRes] = await Promise.all([
      supabase.rpc('dashboard_stats'),
      supabase.from('shipments')
        .select('id, container_number, departure_date, arrival_date, delivery_date, is_completed, client:clients(name), carrier:carriers(name)')
        .is('delivery_date', null)
        .eq('is_completed', false)
        .not('departure_date', 'is', null)
        .order('departure_date', { ascending: false })
        .limit(6),
    ])
    return { stats: statsRes.data, active: activeRes.data }
  },
  ['dashboard-payload'],
  { revalidate: 30, tags: ['shipments'] }
)

export default async function DashboardPage() {
  const { stats: statsData, active } = await getDashboardPayload()

  const stats = (statsData || {
    counts: { cur_loaded: 0, cur_delivered: 0, prev_loaded: 0, prev_delivered: 0, in_transit: 0, on_border: 0 },
    topCarriers: [],
    topRoutes: [],
    mapPoints: [],
  }) as StatsResult

  const data: DashboardData = {
    cur: {
      loaded: stats.counts.cur_loaded,
      inTransit: stats.counts.in_transit,
      onBorder: stats.counts.on_border,
      delivered: stats.counts.cur_delivered,
    },
    prev: {
      loaded: stats.counts.prev_loaded,
      delivered: stats.counts.prev_delivered,
    },
    topCarriers: stats.topCarriers.map(c => ({ name: c.name, count: c.cnt })),
    topRoutes: stats.topRoutes.map(r => ({ route: r.route, count: r.cnt })),
    mapShipments: stats.mapPoints.map(p => ({
      origin: p.origin,
      departure_date: null,
      destination_city: p.destination_city,
      destination_station: p.destination_station,
    })),
    recentActive: (active as unknown as Shipment[]) || [],
  }

  return <DashboardView data={data} />
}
