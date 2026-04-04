'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts'
import { Ship, TrendingUp, TrendingDown, Clock, CheckCircle2, Truck, MapPin, Container, BarChart3, GitCompare, Globe } from 'lucide-react'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const YEARS = ['2022', '2023', '2024', '2025', '2026']

interface ShipmentRow {
  id: string
  departure_date: string | null
  arrival_date: string | null
  delivery_date: string | null
  is_completed: boolean
  container_size: number | null
  container_type: string | null
  origin: string | null
  destination_city: string | null
  destination_station: string | null
  carrier_id: string | null
  is_russia: boolean
  carrier_name: string | null
}

function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0
  return Math.round(((a - b) / b) * 100)
}

export default function ReportsPage() {
  const [data, setData] = useState<ShipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'charts' | 'compare' | 'geo'>('charts')

  // Period comparison
  const now = new Date()
  const [periodA, setPeriodA] = useState({ year: String(now.getFullYear()), monthFrom: '0', monthTo: String(now.getMonth()) })
  const [periodB, setPeriodB] = useState({ year: String(now.getFullYear() - 1), monthFrom: '0', monthTo: String(now.getMonth()) })

  // Charts year
  const [chartYear, setChartYear] = useState(String(now.getFullYear()))

  useEffect(() => {
    const supabase = createClient()
    async function loadAll() {
      const allRows: any[] = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data: rows } = await supabase.from('shipments')
          .select('id, departure_date, arrival_date, delivery_date, is_completed, container_size, container_type, origin, destination_city, destination_station, carrier_id, client:clients(is_russia), carrier:carriers(name)')
          .order('departure_date', { ascending: false })
          .range(from, from + pageSize - 1)
        if (!rows || rows.length === 0) break
        allRows.push(...rows)
        if (rows.length < pageSize) break
        from += pageSize
      }
      const mapped = allRows.map((r: any) => ({
        ...r,
        is_russia: r.client?.is_russia || false,
        carrier_name: r.carrier?.name || null,
      }))
      setData(mapped)
      setLoading(false)
    }
    loadAll()
  }, [])

  // Period filter helper — supports month range
  function filterPeriod(year: string, monthFrom: string, monthTo: string) {
    const y = parseInt(year)
    const mFrom = parseInt(monthFrom)
    const mTo = parseInt(monthTo)
    const start = new Date(y, mFrom, 1)
    const end = new Date(y, mTo + 1, 0)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    const loaded = data.filter(s => s.departure_date && s.departure_date >= startStr && s.departure_date <= endStr)
    const delivered = data.filter(s => s.delivery_date && s.delivery_date >= startStr && s.delivery_date <= endStr)

    const russia = loaded.filter(s => s.is_russia)
    const kz = loaded.filter(s => !s.is_russia)

    return { loaded: loaded.length, delivered: delivered.length, russia: russia.length, kz: kz.length }
  }

  const statsA = useMemo(() => filterPeriod(periodA.year, periodA.monthFrom, periodA.monthTo), [data, periodA])
  const statsB = useMemo(() => filterPeriod(periodB.year, periodB.monthFrom, periodB.monthTo), [data, periodB])

  // Monthly chart data
  const loadedByMonth = useMemo(() => {
    return MONTHS.map((name, i) => {
      const count = data.filter(s => {
        if (!s.departure_date) return false
        const d = new Date(s.departure_date)
        return d.getFullYear() === parseInt(chartYear) && d.getMonth() === i
      }).length
      return { name, count }
    })
  }, [data, chartYear])

  const deliveredByMonth = useMemo(() => {
    return MONTHS.map((name, i) => {
      const count = data.filter(s => {
        if (!s.delivery_date) return false
        const d = new Date(s.delivery_date)
        return d.getFullYear() === parseInt(chartYear) && d.getMonth() === i
      }).length
      return { name, count }
    })
  }, [data, chartYear])

  // Year summary
  const yearData = useMemo(() => {
    const yearShipments = data.filter(s => s.departure_date?.startsWith(chartYear))
    const yearDelivered = data.filter(s => s.delivery_date?.startsWith(chartYear))

    // Avg delivery days
    const withBothDates = yearDelivered.filter(s => s.departure_date && s.delivery_date)
    const avgDays = withBothDates.length > 0
      ? Math.round(withBothDates.reduce((sum, s) => sum + (new Date(s.delivery_date!).getTime() - new Date(s.departure_date!).getTime()) / 86400000, 0) / withBothDates.length)
      : 0

    // Top route
    const routeCounts: Record<string, number> = {}
    yearShipments.forEach(s => {
      const route = `${s.origin || '?'} → ${s.destination_city || s.destination_station || '?'}`
      routeCounts[route] = (routeCounts[route] || 0) + 1
    })
    const topRoute = Object.entries(routeCounts).sort(([, a], [, b]) => b - a)[0]

    // Top carrier
    const carrierCounts: Record<string, number> = {}
    yearShipments.forEach(s => {
      if (s.carrier_name) carrierCounts[s.carrier_name] = (carrierCounts[s.carrier_name] || 0) + 1
    })
    const topCarrier = Object.entries(carrierCounts).sort(([, a], [, b]) => b - a)[0]

    // Container sizes
    const size20 = yearShipments.filter(s => s.container_size === 20).length
    const size40 = yearShipments.filter(s => s.container_size === 40).length

    // Top origins
    const originCounts: Record<string, number> = {}
    yearShipments.forEach(s => { if (s.origin) originCounts[s.origin] = (originCounts[s.origin] || 0) + 1 })
    const topOrigins = Object.entries(originCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }))

    // Top destinations
    const destCounts: Record<string, number> = {}
    yearShipments.forEach(s => {
      const dest = s.destination_city || s.destination_station
      if (dest) destCounts[dest] = (destCounts[dest] || 0) + 1
    })
    const topDests = Object.entries(destCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }))

    return {
      loaded: yearShipments.length, delivered: yearDelivered.length, avgDays,
      topRoute: topRoute ? { route: topRoute[0], count: topRoute[1] } : null,
      topCarrier: topCarrier ? { name: topCarrier[0], count: topCarrier[1] } : null,
      size20, size40, topOrigins, topDests,
    }
  }, [data, chartYear])

  const selCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30'

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-[22px] font-bold text-slate-900 font-heading">Отчёты</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  // Yearly data with % change
  const yearlyLoaded = useMemo(() => {
    return YEARS.map((y, i) => {
      const count = data.filter(s => s.departure_date?.startsWith(y)).length
      const prev = i > 0 ? data.filter(s => s.departure_date?.startsWith(YEARS[i - 1])).length : 0
      const change = i > 0 && prev > 0 ? Math.round(((count - prev) / prev) * 100) : null
      return { name: y, count, change }
    })
  }, [data])

  const yearlyDelivered = useMemo(() => {
    return YEARS.map((y, i) => {
      const count = data.filter(s => s.delivery_date?.startsWith(y)).length
      const prev = i > 0 ? data.filter(s => s.delivery_date?.startsWith(YEARS[i - 1])).length : 0
      const change = i > 0 && prev > 0 ? Math.round(((count - prev) / prev) * 100) : null
      return { name: y, count, change }
    })
  }, [data])

  const tabs = [
    { key: 'charts' as const, label: 'Графики', icon: BarChart3 },
    { key: 'compare' as const, label: 'Сравнение', icon: GitCompare },
    { key: 'geo' as const, label: 'География', icon: Globe },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Отчёты</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 pb-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              activeTab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <t.icon className="w-3.5 h-3.5" strokeWidth={activeTab === t.key ? 2.2 : 1.6} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Charts ── */}
      {activeTab === 'charts' && <>

      {/* Yearly totals with % change */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Загружено по годам</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearlyLoaded} barSize={44}>
              <defs><linearGradient id="gradYearLoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#4f46e5" /></linearGradient></defs>
              <CartesianGrid stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Загружено" fill="url(#gradYearLoad)" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="count" position="inside" fill="#fff" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* % change badges */}
          <div className="flex justify-around mt-2">
            {yearlyLoaded.map(y => (
              <div key={y.name} className="text-center">
                {y.change !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${y.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {y.change >= 0 ? '+' : ''}{y.change}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Доставлено по годам</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearlyDelivered} barSize={44}>
              <defs><linearGradient id="gradYearDel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs>
              <CartesianGrid stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Доставлено" fill="url(#gradYearDel)" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="count" position="inside" fill="#fff" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {yearlyDelivered.map(y => (
              <div key={y.name} className="text-center">
                {y.change !== null && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${y.change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {y.change >= 0 ? '+' : ''}{y.change}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      </>}

      {/* ── TAB: Compare ── */}
      {activeTab === 'compare' && <>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col lg:flex-row">
        {/* Left: selectors + numbers */}
        <div className="lg:w-[280px] shrink-0 p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900 mb-5">Сравнение периодов</h2>

          {/* Period A */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span className="text-[11px] text-slate-400 font-medium">Период A</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select value={periodA.monthFrom} onChange={e => setPeriodA(p => ({ ...p, monthFrom: e.target.value }))} className={selCls + ' text-[12px]'}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <span className="text-[10px] text-slate-300">—</span>
              <select value={periodA.monthTo} onChange={e => setPeriodA(p => ({ ...p, monthTo: e.target.value }))} className={selCls + ' text-[12px]'}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={periodA.year} onChange={e => setPeriodA(p => ({ ...p, year: e.target.value }))} className={selCls + ' text-[12px]'}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Period B */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[11px] text-slate-400 font-medium">Период B</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select value={periodB.monthFrom} onChange={e => setPeriodB(p => ({ ...p, monthFrom: e.target.value }))} className={selCls + ' text-[12px]'}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <span className="text-[10px] text-slate-300">—</span>
              <select value={periodB.monthTo} onChange={e => setPeriodB(p => ({ ...p, monthTo: e.target.value }))} className={selCls + ' text-[12px]'}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={periodB.year} onChange={e => setPeriodB(p => ({ ...p, year: e.target.value }))} className={selCls + ' text-[12px]'}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Quick stats */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {[
              { label: 'Загружено', a: statsA.loaded, b: statsB.loaded },
              { label: 'Доставлено', a: statsA.delivered, b: statsB.delivered },
              { label: 'РФ', a: statsA.russia, b: statsB.russia },
              { label: 'КЗ', a: statsA.kz, b: statsB.kz },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-500">{r.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600">{r.a}</span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-emerald-600">{r.b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chart */}
        <div className="flex-1 p-5 min-w-0">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={[
              { name: 'Загружено', a: statsA.loaded, b: statsB.loaded },
              { name: 'Доставлено', a: statsA.delivered, b: statsB.delivered },
              { name: 'РФ', a: statsA.russia, b: statsB.russia },
              { name: 'КЗ', a: statsA.kz, b: statsB.kz },
            ]} barGap={2} barSize={36}>
              <defs>
                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="a" name={`${MONTHS[+periodA.monthFrom]}–${MONTHS[+periodA.monthTo]} ${periodA.year}`} fill="url(#gradA)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="b" name={`${MONTHS[+periodB.monthFrom]}–${MONTHS[+periodB.monthTo]} ${periodB.year}`} fill="url(#gradB)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      </>}

      {/* ── TAB: Charts (continued) — monthly + summary ── */}
      {activeTab === 'charts' && <>

      {/* ── Year selector ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-[16px] font-bold text-slate-900 font-heading">Годовая статистика</h2>
        <select value={chartYear} onChange={e => setChartYear(e.target.value)} className={selCls}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Charts: Loaded + Delivered ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Loaded chart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Загружено по месяцам</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={loadedByMonth} barSize={24}>
              <CartesianGrid stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Загружено" radius={[6, 6, 0, 0]}>
                {loadedByMonth.map((_, i) => <Cell key={i} fill="#6366f1" opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Delivered chart */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Доставлено по месяцам</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deliveredByMonth} barSize={24}>
              <CartesianGrid stroke="#e2e8f0" strokeOpacity={0.8} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Доставлено" radius={[6, 6, 0, 0]}>
                {deliveredByMonth.map((_, i) => <Cell key={i} fill="#10b981" opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Year Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Загружено</p>
          <p className="text-[22px] font-bold text-slate-900">{yearData.loaded}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Доставлено</p>
          <p className="text-[22px] font-bold text-emerald-600">{yearData.delivered}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Среднее время</p>
          <p className="text-[22px] font-bold text-slate-900">{yearData.avgDays}<span className="text-[12px] text-slate-400 ml-1">дней</span></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Топ маршрут</p>
          <p className="text-[13px] font-bold text-slate-900 truncate">{yearData.topRoute?.route || '—'}</p>
          <p className="text-[11px] text-slate-400">{yearData.topRoute?.count || 0} перевозок</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Топ перевозчик</p>
          <p className="text-[13px] font-bold text-slate-900 truncate">{yearData.topCarrier?.name || '—'}</p>
          <p className="text-[11px] text-slate-400">{yearData.topCarrier?.count || 0} перевозок</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[11px] text-slate-400 mb-1">Контейнеры</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold">20ft: {yearData.size20}</span>
            <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-semibold">40ft: {yearData.size40}</span>
          </div>
        </div>
      </div>

      </>}

      {/* ── TAB: Geography ── */}
      {activeTab === 'geo' && <>
      {/* ── Geography: Origins + Destinations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ отправления</h3>
          <div className="space-y-2.5">
            {yearData.topOrigins.map((o, i) => {
              const max = yearData.topOrigins[0]?.count || 1
              return (
                <div key={o.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-700">{o.name}</span>
                    <span className="text-[12px] font-semibold text-slate-900">{o.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(o.count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ назначения</h3>
          <div className="space-y-2.5">
            {yearData.topDests.map((d, i) => {
              const max = yearData.topDests[0]?.count || 1
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-700">{d.name}</span>
                    <span className="text-[12px] font-semibold text-slate-900">{d.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      </>}
    </div>
  )
}
