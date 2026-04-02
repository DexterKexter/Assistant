'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShipmentModal } from '@/lib/shipment-modal'
import { Ship, Users, TrendingUp, Package, ArrowRight, ArrowUpRight, ArrowDownRight, MapPin, Truck, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { type Shipment } from '@/types/database'
import dynamic from 'next/dynamic'

const DashboardMap = dynamic(() => import('@/components/dashboard-map').then(m => ({ default: m.DashboardMap })), { ssr: false })

interface MonthStats {
  loaded: number
  inTransit: number
  onBorder: number
  delivered: number
}

export default function DashboardPage() {
  const [cur, setCur] = useState<MonthStats>({ loaded: 0, inTransit: 0, onBorder: 0, delivered: 0 })
  const [prev, setPrev] = useState<MonthStats>({ loaded: 0, inTransit: 0, onBorder: 0, delivered: 0 })
  const [topCarriers, setTopCarriers] = useState<{ name: string; count: number }[]>([])
  const [topRoutes, setTopRoutes] = useState<{ route: string; count: number }[]>([])
  const [originCounts, setOriginCounts] = useState<{ name: string; count: number }[]>([])
  const [recentActive, setRecentActive] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { openShipment } = useShipmentModal()

  useEffect(() => {
    const supabase = createClient()
    const now = new Date()
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const fetchData = async () => {
      const [
        { count: curLoaded },
        { count: curDelivered },
        { count: prevLoaded },
        { count: prevDelivered },
        { count: inTransit },
        { count: onBorder },
        { data: active },
        { data: allShipments },
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', curStart),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('delivery_date', curStart),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', prevStart).lte('departure_date', prevEnd),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('delivery_date', prevStart).lte('delivery_date', prevEnd),
        // В пути: отправлен, не на границе, не доставлен
        supabase.from('shipments').select('*', { count: 'exact', head: true }).not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false),
        // На границе: есть arrival, нет delivery
        supabase.from('shipments').select('*', { count: 'exact', head: true }).not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false),
        // Active shipments list
        supabase.from('shipments').select('*, client:clients(name), carrier:carriers(name)').is('delivery_date', null).eq('is_completed', false).not('departure_date', 'is', null).order('departure_date', { ascending: false }).limit(6),
        // All for analytics
        supabase.from('shipments').select('carrier_id, origin, destination_city, destination_station, arrival_date, delivery_date, is_completed').not('departure_date', 'is', null).order('departure_date', { ascending: false }).limit(2000),
      ])

      setCur({ loaded: curLoaded || 0, inTransit: inTransit || 0, onBorder: onBorder || 0, delivered: curDelivered || 0 })
      setPrev({ loaded: prevLoaded || 0, inTransit: 0, onBorder: 0, delivered: prevDelivered || 0 })
      setRecentActive((active as unknown as Shipment[]) || [])

      // Top carriers — only active (in transit, no delivery)
      const carrierCounts: Record<string, number> = {}
      const { data: carriers } = await supabase.from('carriers').select('id, name')
      const carrierMap = Object.fromEntries((carriers || []).map(c => [c.id, c.name]))
      ;(allShipments || []).filter(s => !s.delivery_date && !s.is_completed).forEach(s => {
        if (s.carrier_id) carrierCounts[s.carrier_id] = (carrierCounts[s.carrier_id] || 0) + 1
      })
      setTopCarriers(
        Object.entries(carrierCounts)
          .map(([id, count]) => ({ name: carrierMap[id] || id, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      )

      // Top routes
      const routeCounts: Record<string, number> = {}
      ;(allShipments || []).forEach(s => {
        const route = `${s.origin || '?'} → ${s.destination_city || s.destination_station || '?'}`
        routeCounts[route] = (routeCounts[route] || 0) + 1
      })
      setTopRoutes(
        Object.entries(routeCounts)
          .map(([route, count]) => ({ route, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      )

      // Origin counts for map
      const originCountsMap: Record<string, number> = {}
      ;(allShipments || []).forEach(s => {
        if (s.origin) originCountsMap[s.origin] = (originCountsMap[s.origin] || 0) + 1
      })
      setOriginCounts(
        Object.entries(originCountsMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      )

      setLoading(false)
    }
    fetchData()
  }, [])

  const diff = (c: number, p: number) => {
    if (p === 0) return { text: c > 0 ? `+${c}` : '—', up: c >= 0 }
    const pct = Math.round(((c - p) / p) * 100)
    return { text: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 }
  }

  const month = new Date().toLocaleString('ru-RU', { month: 'long' })

  const cards = [
    { label: 'Загружено', value: cur.loaded, prev: prev.loaded, icon: Ship, gradient: 'from-indigo-500 to-indigo-600', compare: true },
    { label: 'В пути', value: cur.inTransit, prev: 0, icon: Truck, gradient: 'from-blue-500 to-blue-600', compare: false },
    { label: 'На границе', value: cur.onBorder, prev: 0, icon: Clock, gradient: 'from-amber-500 to-orange-500', compare: false },
    { label: 'Доставлено', value: cur.delivered, prev: prev.delivered, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', compare: true },
  ]

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const d = diff(card.value, card.prev)
          return (
            <div key={card.label} className="animate-fade-up bg-white rounded-xl px-4 py-3.5 border border-slate-100 card-interactive" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[17px] font-bold text-slate-900 tracking-tight leading-none font-heading">
                      {loading ? <span className="skeleton inline-block w-10 h-6" /> : card.value.toLocaleString()}
                    </p>
                    {card.compare && card.prev > 0 && (
                      <span className={`text-[10px] ${d.up ? 'text-emerald-500' : 'text-red-400'}`}>{d.text}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Map */}
      {!loading && originCounts.length > 0 && <DashboardMap origins={originCounts} />}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Active shipments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading">Активные перевозки</h2>
            <button onClick={() => router.push('/dashboard/shipments')} className="flex items-center gap-1 text-[12px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
              Все <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="px-5 pb-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}</div>
          ) : recentActive.length === 0 ? (
            <div className="px-5 pb-8 text-center text-slate-400 text-[13px]">Нет активных перевозок</div>
          ) : (
            <div>
              {recentActive.map((s) => {
                const days = s.departure_date ? Math.round((Date.now() - new Date(s.departure_date).getTime()) / 86400000) : 0
                const hasArrival = !!s.arrival_date
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-50 cursor-pointer hover:bg-slate-50/40 transition-colors" onClick={() => openShipment(s.id)}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasArrival ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                      {hasArrival ? <Clock className="w-4 h-4 text-amber-500" /> : <Truck className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">{s.container_number}</p>
                      <p className="text-[11px] text-slate-400">{(s.client as unknown as { name: string })?.name || '—'} · {(s.carrier as unknown as { name: string })?.name || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-slate-700">{days}д</p>
                      <p className="text-[10px] text-slate-400">{hasArrival ? 'на границе' : 'в пути'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Top carriers */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading mb-3">Перевозчики в пути</h2>
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-6 w-full" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {topCarriers.map((c, i) => {
                  const max = topCarriers[0]?.count || 1
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[12px] text-slate-600 truncate">{c.name}</p>
                        <p className="text-[12px] font-semibold text-slate-800">{c.count}</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top routes */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading mb-3">Популярные маршруты</h2>
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-6 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {topRoutes.map((r) => (
                  <div key={r.route} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                      <p className="text-[12px] text-slate-600 truncate">{r.route}</p>
                    </div>
                    <span className="text-[12px] font-semibold text-slate-800 shrink-0 ml-2">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
