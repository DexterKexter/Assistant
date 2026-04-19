'use client'

import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useShipmentModal } from '@/lib/shipment-modal'
import { Ship, ArrowRight, MapPin, Truck, Clock, CheckCircle2 } from 'lucide-react'
import { type Shipment } from '@/types/database'

const DashboardMap = dynamic(() => import('@/components/dashboard-map').then(m => ({ default: m.DashboardMap })), { ssr: false })

export interface DashboardData {
  cur: { loaded: number; inTransit: number; onBorder: number; delivered: number }
  prev: { loaded: number; delivered: number }
  topCarriers: { name: string; count: number }[]
  topRoutes: { route: string; count: number }[]
  mapShipments: { origin: string | null; departure_date: string | null; destination_city: string | null; destination_station: string | null }[]
  recentActive: Shipment[]
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { cur, prev, topCarriers, topRoutes, mapShipments, recentActive } = data
  const router = useRouter()
  const { openShipment } = useShipmentModal()

  const diff = (c: number, p: number) => {
    if (p === 0) return { text: c > 0 ? `+${c}` : '—', up: c >= 0 }
    const pct = Math.round(((c - p) / p) * 100)
    return { text: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 }
  }

  const cards = [
    { label: 'Загружено', value: cur.loaded, prev: prev.loaded, icon: Ship, gradient: 'from-indigo-500 to-indigo-600', compare: true },
    { label: 'В пути', value: cur.inTransit, prev: 0, icon: Truck, gradient: 'from-blue-500 to-blue-600', compare: false },
    { label: 'На границе', value: cur.onBorder, prev: 0, icon: Clock, gradient: 'from-amber-500 to-orange-500', compare: false },
    { label: 'Доставлено', value: cur.delivered, prev: prev.delivered, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', compare: true },
  ]

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="-mx-3 -mt-3 md:-mx-5 md:-mt-4 mb-1 hidden md:block">
        {mapShipments.length > 0 && <DashboardMap shipments={mapShipments} />}
      </div>

      <div className="grid gap-2 grid-cols-2 md:gap-3 lg:grid-cols-4">
        {cards.map((card, i) => {
          const d = diff(card.value, card.prev)
          return (
            <div key={card.label} className="animate-fade-up bg-white rounded-xl px-3 py-3 md:px-4 md:py-3.5 border border-slate-100 shadow-sm card-interactive" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-2.5 md:gap-3">
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <p className="text-[15px] md:text-[17px] font-bold text-slate-900 tracking-tight leading-none font-heading">
                      {card.value.toLocaleString()}
                    </p>
                    {card.compare && card.prev > 0 && (
                      <span className={`text-[10px] ${d.up ? 'text-emerald-500' : 'text-red-400'}`}>{d.text}</span>
                    )}
                  </div>
                  <p className="text-[11px] md:text-[12px] text-slate-400 mt-0.5">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading">Активные перевозки</h2>
            <button onClick={() => router.push('/dashboard/shipments')} className="flex items-center gap-1 text-[12px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
              Все <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentActive.length === 0 ? (
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

        <div className="space-y-4">
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading mb-3">Перевозчики в пути</h2>
            <div className="space-y-2.5">
              {topCarriers.map((c) => {
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
          </div>

          <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-5">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading mb-3">Популярные маршруты</h2>
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
          </div>
        </div>
      </div>
    </div>
  )
}
