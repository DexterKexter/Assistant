'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShipmentModal } from '@/lib/shipment-modal'
import { type Carrier, type Shipment, getShipmentStatus } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import {
  ArrowLeft, Truck, Ship, DollarSign, Clock, ChevronRight, CheckCircle2,
  Search, MapPin, Users, Package, TrendingUp, Calendar
} from 'lucide-react'

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

export default function CarrierDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { openShipment } = useShipmentModal()
  const [carrier, setCarrier] = useState<Carrier | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [activityYear, setActivityYear] = useState<string>('all')
  const [shipmentSearch, setShipmentSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [{ data: c }, { data: sh }] = await Promise.all([
        supabase.from('carriers').select('*').eq('id', id).single(),
        supabase.from('shipments').select('*, client:clients(name, is_russia)').eq('carrier_id', id).order('departure_date', { ascending: false }),
      ])
      setCarrier(c)
      setShipments((sh || []) as any)
      setLoading(false)
    }
    load()
  }, [id])

  const analytics = useMemo(() => {
    if (!shipments.length) return null

    const total = shipments.length
    const delivered = shipments.filter(s => s.delivery_date || s.is_completed).length
    const inTransit = shipments.filter(s => s.departure_date && !s.arrival_date && !s.delivery_date && !s.is_completed).length

    // Avg delivery time
    const withBoth = shipments.filter(s => s.departure_date && s.delivery_date)
    const avgDays = withBoth.length > 0
      ? Math.round(withBoth.reduce((sum, s) => sum + (new Date(s.delivery_date!).getTime() - new Date(s.departure_date!).getTime()) / 86400000, 0) / withBoth.length)
      : 0

    // Finance
    const costs = shipments.filter(s => s.delivery_cost).map(s => s.delivery_cost!)
    const totalCost = costs.reduce((a, b) => a + b, 0)
    const avgCost = costs.length > 0 ? Math.round(totalCost / costs.length) : 0
    const prices = shipments.filter(s => s.price).map(s => s.price!)
    const totalPrice = prices.reduce((a, b) => a + b, 0)
    const avgPrice = prices.length > 0 ? Math.round(totalPrice / prices.length) : 0

    // Top clients
    const clientCounts: Record<string, number> = {}
    shipments.forEach(s => { const name = (s as any).client?.name; if (name) clientCounts[name] = (clientCounts[name] || 0) + 1 })
    const topClients = Object.entries(clientCounts).sort(([, a], [, b]) => b - a).slice(0, 5)

    // Top routes
    const routeCounts: Record<string, number> = {}
    shipments.forEach(s => {
      const route = `${s.origin || '?'} → ${s.destination_city || s.destination_station || '?'}`
      routeCounts[route] = (routeCounts[route] || 0) + 1
    })
    const topRoutes = Object.entries(routeCounts).sort(([, a], [, b]) => b - a).slice(0, 5)

    // Container sizes
    const size20 = shipments.filter(s => s.container_size === 20).length
    const size40 = shipments.filter(s => s.container_size === 40).length

    // Available years
    const yearsSet = new Set<string>()
    shipments.forEach(s => { if (s.departure_date) yearsSet.add(s.departure_date.slice(0, 4)) })
    const availableYears = Array.from(yearsSet).sort()

    // Activity
    const monthlyActivity: { month: string; count: number }[] = []
    if (activityYear === 'all') {
      availableYears.forEach(y => {
        const count = shipments.filter(s => s.departure_date?.startsWith(y)).length
        monthlyActivity.push({ month: y, count })
      })
    } else {
      for (let m = 0; m < 12; m++) {
        const key = `${activityYear}-${String(m + 1).padStart(2, '0')}`
        const count = shipments.filter(s => s.departure_date?.startsWith(key)).length
        monthlyActivity.push({ month: MONTH_LABELS[m], count })
      }
    }
    const maxMonthly = Math.max(...monthlyActivity.map(m => m.count), 1)

    // First & last
    const dates = shipments.filter(s => s.departure_date).map(s => new Date(s.departure_date!).getTime())
    const firstShipment = dates.length ? new Date(Math.min(...dates)) : null
    const lastShipment = dates.length ? new Date(Math.max(...dates)) : null

    return {
      total, delivered, inTransit, avgDays,
      totalCost, avgCost, totalPrice, avgPrice,
      topClients, topRoutes, size20, size40,
      availableYears, monthlyActivity, maxMonthly,
      firstShipment, lastShipment,
    }
  }, [shipments, activityYear])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3"><div className="skeleton w-8 h-8 rounded-lg" /><div className="skeleton h-7 w-48 rounded-lg" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!carrier) return <p className="text-[13px] text-slate-400 py-10 text-center">Перевозчик не найден</p>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Truck className="w-6 h-6" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold text-slate-900 tracking-tight font-heading truncate">{carrier.name}</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">{shipments.length} перевозок за всё время</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Перевозок', value: analytics.total, icon: Ship, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Доставлено', value: analytics.delivered, icon: CheckCircle2, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Средн. стоимость', value: analytics.avgCost > 0 ? `$${analytics.avgCost.toLocaleString()}` : '—', icon: DollarSign, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Среднее время', value: `${analytics.avgDays} д`, icon: Clock, color: '#8b5cf6', bg: '#f5f3ff' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-50 rounded-xl border border-slate-200/60 p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{stat.label}</span>
              </div>
              <p className="text-[22px] font-bold text-slate-900 leading-none">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">

          {/* Activity */}
          {analytics && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-semibold text-slate-900">Активность</h3>
                <div className="flex items-center gap-1">
                  {['all', ...analytics.availableYears].map(y => (
                    <button key={y} onClick={() => setActivityYear(y)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${activityYear === y ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                      {y === 'all' ? 'Все' : y}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-[140px]">
                {analytics.monthlyActivity.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: 110 }}>
                      <div className="absolute bottom-0 w-full rounded-t-sm" style={{
                        height: `${Math.max(2, (m.count / analytics.maxMonthly) * 110)}px`,
                        backgroundColor: m.count > 0 ? '#f59e0b' : '#e2e8f0',
                        opacity: m.count > 0 ? 0.8 : 0.4,
                      }} />
                      {m.count > 0 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500">{m.count}</span>}
                    </div>
                    <span className="text-[8px] text-slate-400">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finance */}
          {analytics && (analytics.totalCost > 0 || analytics.totalPrice > 0) && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Финансы</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Общая стоимость', value: `$${analytics.totalCost.toLocaleString()}`, color: 'text-amber-600' },
                  { label: 'Средняя стоимость', value: `$${analytics.avgCost.toLocaleString()}`, color: 'text-amber-600' },
                  { label: 'Общая цена', value: analytics.totalPrice > 0 ? `$${analytics.totalPrice.toLocaleString()}` : '—', color: 'text-indigo-600' },
                  { label: 'Средняя цена', value: analytics.avgPrice > 0 ? `$${analytics.avgPrice.toLocaleString()}` : '—', color: 'text-indigo-600' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{f.label}</p>
                    <p className={`text-[18px] font-bold ${f.color} mt-0.5`}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipments */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200/60">
              <h3 className="text-[13px] font-semibold text-slate-900 shrink-0">Перевозки ({shipments.length})</h3>
              <div className="relative flex-1 max-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" strokeWidth={2} />
                <input value={shipmentSearch} onChange={e => setShipmentSearch(e.target.value)} placeholder="Контейнер, маршрут..."
                  className="w-full h-7 pl-7 pr-2 rounded-md bg-white border border-slate-200/60 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20" />
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {shipments.filter(s => {
                if (!shipmentSearch) return true
                const q = shipmentSearch.toLowerCase()
                return s.container_number?.toLowerCase().includes(q) || s.origin?.toLowerCase().includes(q) || s.destination_city?.toLowerCase().includes(q)
              }).map(s => {
                const isRussia = (s as any).client?.is_russia || false
                const status = getShipmentStatus(s, isRussia)
                return (
                  <button key={s.id} onClick={() => openShipment(s.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/60 transition-colors border-b border-slate-100 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-semibold text-slate-800">{s.container_number || '—'}</span>
                        {s.container_size && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${s.container_size === 20 ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>{s.container_size}ft</span>}
                        {s.delivery_cost && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">${s.delivery_cost.toLocaleString()}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{s.origin || '?'} → {s.destination_city || s.destination_station || '?'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-400 tabular-nums hidden sm:block">{fmtDate(s.departure_date)}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '18', color: status.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />{status.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
            <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Информация</h3>
            <div className="space-y-3">
              {[
                { icon: Calendar, label: 'Первая перевозка', value: analytics?.firstShipment ? analytics.firstShipment.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '—' },
                { icon: Calendar, label: 'Последняя перевозка', value: analytics?.lastShipment ? analytics.lastShipment.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '—' },
                { icon: Package, label: 'Контейнеры 20/40', value: analytics ? `${analytics.size20} / ${analytics.size40}` : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <item.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="text-[12px] text-slate-700 font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {analytics && analytics.topClients.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Топ клиенты</h3>
              <div className="space-y-2">
                {analytics.topClients.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-700 truncate max-w-[140px]">{name}</span>
                    <span className="text-[12px] font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics && analytics.topRoutes.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
              <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Топ маршруты</h3>
              <div className="space-y-2">
                {analytics.topRoutes.map(([route, count]) => (
                  <div key={route} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600 truncate">{route}</span>
                    <span className="text-[11px] font-semibold text-slate-900 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
