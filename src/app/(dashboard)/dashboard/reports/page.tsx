'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList, PieChart, Pie } from 'recharts'
import { Ship, TrendingUp, TrendingDown, Clock, CheckCircle2, Truck, MapPin, Container, BarChart3, GitCompare, Globe, CalendarDays } from 'lucide-react'
import { fmtDate } from '@/lib/utils'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const YEARS = ['2022', '2023', '2024', '2025', '2026']

interface ShipmentRow {
  id: string
  container_number: string | null
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
  sender_name: string | null
  is_russia: boolean
  carrier_name: string | null
  client_name: string | null
}

function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0
  return Math.round(((a - b) / b) * 100)
}

export default function ReportsPage() {
  const [data, setData] = useState<ShipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'charts' | 'compare' | 'monthly'>('charts')

  // Period comparison
  const now = new Date()

  // Monthly report
  const [monthlyMonth, setMonthlyMonth] = useState(String(now.getMonth()))
  const [monthlyYear, setMonthlyYear] = useState(String(now.getFullYear()))
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
          .select('id, container_number, departure_date, arrival_date, delivery_date, is_completed, container_size, container_type, origin, destination_city, destination_station, carrier_id, sender_name, client:clients(name, is_russia), carrier:carriers(name)')
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
        client_name: r.client?.name || null,
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
    // Build date strings without timezone conversion
    const startStr = `${y}-${String(mFrom + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, mTo + 1, 0).getDate()
    const endStr = `${y}-${String(mTo + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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

    // Top carriers (all)
    const allCarriers = Object.entries(carrierCounts).sort(([, a], [, b]) => b - a).slice(0, 7).map(([name, count]) => ({ name, count }))

    // Top clients
    const clientCounts: Record<string, number> = {}
    yearShipments.forEach(s => { if (s.client_name) clientCounts[s.client_name] = (clientCounts[s.client_name] || 0) + 1 })
    const topClients = Object.entries(clientCounts).sort(([, a], [, b]) => b - a).slice(0, 7).map(([name, count]) => ({ name, count }))

    return {
      loaded: yearShipments.length, delivered: yearDelivered.length, avgDays,
      topRoute: topRoute ? { route: topRoute[0], count: topRoute[1] } : null,
      topCarrier: topCarrier ? { name: topCarrier[0], count: topCarrier[1] } : null,
      size20, size40, topOrigins, topDests, allCarriers, topClients,
    }
  }, [data, chartYear])

  // Yearly data with % change — MUST be before any early return
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

  // Monthly grid: years × months for comparison table (loaded + delivered)
  const monthlyGrid = useMemo(() => {
    const loaded: Record<string, number[]> = {}
    const delivered: Record<string, number[]> = {}
    let maxVal = 0
    YEARS.forEach(y => {
      loaded[y] = MONTHS.map((_, m) => {
        const count = data.filter(s => {
          if (!s.departure_date) return false
          const d = new Date(s.departure_date)
          return d.getFullYear() === parseInt(y) && d.getMonth() === m
        }).length
        if (count > maxVal) maxVal = count
        return count
      })
      delivered[y] = MONTHS.map((_, m) => {
        const count = data.filter(s => {
          if (!s.delivery_date) return false
          const d = new Date(s.delivery_date)
          return d.getFullYear() === parseInt(y) && d.getMonth() === m
        }).length
        if (count > maxVal) maxVal = count
        return count
      })
    })
    return { loaded, delivered, maxVal }
  }, [data])

  // Monthly report data
  const monthlyData = useMemo(() => {
    const y = parseInt(monthlyYear)
    const m = parseInt(monthlyMonth)
    const filtered = data.filter(s => {
      if (!s.departure_date) return false
      const d = new Date(s.departure_date)
      return d.getFullYear() === y && d.getMonth() === m
    })
    const delivered = filtered.filter(s => s.delivery_date || s.is_completed).length
    const inTransit = filtered.filter(s => s.departure_date && !s.arrival_date && !s.delivery_date && !s.is_completed).length
    const atBorder = filtered.filter(s => s.arrival_date && !s.delivery_date && !s.is_completed).length
    return { rows: filtered, total: filtered.length, delivered, inTransit, atBorder }
  }, [data, monthlyMonth, monthlyYear])

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

  const tabs = [
    { key: 'charts' as const, label: 'Годовой отчет', icon: BarChart3 },
    { key: 'monthly' as const, label: 'Месячный отчет', icon: CalendarDays },
    { key: 'compare' as const, label: 'Сравнение', icon: GitCompare },
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

      {/* ── TAB: Годовой отчет ── */}
      {activeTab === 'charts' && <>

      {/* ── 1. Year selector ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-[16px] font-bold text-slate-900 font-heading">Годовая статистика</h2>
        <select value={chartYear} onChange={e => setChartYear(e.target.value)} className={selCls}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── 2. Yearly bar charts ── */}
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
                <LabelList dataKey="change" position="top" fontSize={10} fontWeight={600} formatter={(v: number | null) => v !== null ? `${v >= 0 ? '+' : ''}${v}%` : ''} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
                <LabelList dataKey="change" position="top" fontSize={10} fontWeight={600} formatter={(v: number | null) => v !== null ? `${v >= 0 ? '+' : ''}${v}%` : ''} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. Summary tiles ── */}
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

      {/* ── 4. Monthly charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* ── 5. Geography: Pie Charts (clean, no labels) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ отправления</h3>
          <div className="flex items-center">
            <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={yearData.topOrigins} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} label={false}>
                    {yearData.topOrigins.map((_, i) => (
                      <Cell key={i} fill={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][i] || '#e2e8f0'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 ml-4">
              {yearData.topOrigins.map((o, i) => (
                <div key={o.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][i] || '#e2e8f0' }} />
                  <span className="text-[12px] text-slate-700 flex-1">{o.name}</span>
                  <span className="text-[12px] font-semibold text-slate-900">{o.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ назначения</h3>
          <div className="flex items-center">
            <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={yearData.topDests} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} label={false}>
                    {yearData.topDests.map((_, i) => (
                      <Cell key={i} fill={['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][i] || '#e2e8f0'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 ml-4">
              {yearData.topDests.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'][i] || '#e2e8f0' }} />
                  <span className="text-[12px] text-slate-700 flex-1">{d.name}</span>
                  <span className="text-[12px] font-semibold text-slate-900">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Top Carriers & Top Clients: Horizontal Bar Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ перевозчики</h3>
          <div className="space-y-2.5">
            {yearData.allCarriers.map((c, i) => {
              const max = yearData.allCarriers[0]?.count || 1
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-700 truncate max-w-[200px]">{c.name}</span>
                    <span className="text-[12px] font-semibold text-slate-900 ml-2 shrink-0">{c.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: i === 0 ? '#f59e0b' : '#fbbf24' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Топ клиенты</h3>
          <div className="space-y-2.5">
            {yearData.topClients.map((c, i) => {
              const max = yearData.topClients[0]?.count || 1
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-700 truncate max-w-[200px]">{c.name}</span>
                    <span className="text-[12px] font-semibold text-slate-900 ml-2 shrink-0">{c.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: i === 0 ? '#e11d48' : '#fb7185' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      </>}

      {/* ── TAB: Monthly Report ── */}
      {activeTab === 'monthly' && <>

      {/* Header: selectors + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[16px] font-bold text-slate-900 font-heading">Отчет за</h2>
        <select value={monthlyMonth} onChange={e => setMonthlyMonth(e.target.value)} className={selCls}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={monthlyYear} onChange={e => setMonthlyYear(e.target.value)} className={selCls}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <span className="text-[12px] text-slate-600">Всего: <strong>{monthlyData.total}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[12px] text-slate-600">В пути: <strong>{monthlyData.inTransit}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[12px] text-slate-600">На границе: <strong>{monthlyData.atBorder}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[12px] text-slate-600">Доставлено: <strong>{monthlyData.delivered}</strong></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        {monthlyData.rows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-[13px]">Нет данных за {MONTH_NAMES[+monthlyMonth]} {monthlyYear}</div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100">
                {['Контейнер', 'Откуда', 'Погранпереход', 'Город', 'Клиент', 'Перевозчик', 'Загрузка', 'Граница', 'Доставка', 'Статус'].map(h => (
                  <th key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-left px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.rows.map(s => {
                const status = (() => {
                  if (s.delivery_date || s.is_completed) return { label: 'Доставлен', color: '#22c55e' }
                  if (s.arrival_date) {
                    if (s.is_russia) return { label: 'Транзит КЗ', color: '#f59e0b' }
                    return { label: 'На границе', color: '#f59e0b' }
                  }
                  if (s.departure_date) return { label: 'В пути', color: '#6366f1' }
                  return { label: 'Загрузка', color: '#94a3b8' }
                })()
                return (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-[12px] font-mono font-semibold text-slate-900">{s.container_number || '—'}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {s.container_size && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${s.container_size === 20 ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                            {s.container_size}ft
                          </span>
                        )}
                        {s.container_type && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            s.container_type === 'Выкупной' ? 'bg-amber-50 text-amber-600' :
                            s.container_type === 'Возвратный' ? 'bg-emerald-50 text-emerald-600' :
                            s.container_type === 'Собственный' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                          }`}>
                            {s.container_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[100px] truncate">{s.origin || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[100px] truncate">{s.destination_station || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[100px] truncate">{s.destination_city || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-700 font-medium max-w-[120px] truncate">{s.client_name || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[100px] truncate">{s.carrier_name || '—'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtDate(s.departure_date)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtDate(s.arrival_date)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{fmtDate(s.delivery_date)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: status.color + '18', color: status.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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
            ].map(r => {
              // Show % change of B relative to A: positive = B grew, negative = B shrank
              const diff = r.a > 0 ? Math.round(((r.b - r.a) / r.a) * 100) : r.b > 0 ? 100 : 0
              return (
                <div key={r.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-500">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600">{r.a}</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-bold text-emerald-600">{r.b}</span>
                    <span className={`text-[10px] font-semibold ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{diff}%
                    </span>
                  </div>
                </div>
              )
            })}
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
              <Bar dataKey="a" name={`${MONTHS[+periodA.monthFrom]}–${MONTHS[+periodA.monthTo]} ${periodA.year}`} fill="url(#gradA)" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="a" position="top" fontSize={11} fontWeight={600} fill="#6366f1" />
              </Bar>
              <Bar dataKey="b" name={`${MONTHS[+periodB.monthFrom]}–${MONTHS[+periodB.monthTo]} ${periodB.year}`} fill="url(#gradB)" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="b" position="top" fontSize={11} fontWeight={600} fill="#059669" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly comparison table: years × months */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 overflow-x-auto">
        <h3 className="text-[13px] font-semibold text-slate-900 mb-4">Загрузки по месяцам / годам</h3>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              <th className="text-[11px] font-semibold text-slate-400 text-left pb-3 pr-3 w-[60px]">Год</th>
              {MONTHS.map(m => (
                <th key={m} className="text-[11px] font-medium text-slate-400 text-center pb-3 px-1">{m}</th>
              ))}
              <th className="text-[11px] font-semibold text-slate-400 text-center pb-3 pl-2">Итого</th>
            </tr>
          </thead>
          <tbody>
            {YEARS.map((y, yi) => {
              const months = monthlyGrid.loaded[y] || Array(12).fill(0)
              const total = months.reduce((a: number, b: number) => a + b, 0)
              const colors = ['#94a3b8', '#818cf8', '#6366f1', '#4f46e5', '#6366f1']
              return (
                <tr key={y} className="border-t border-slate-50">
                  <td className="text-[12px] font-semibold text-slate-700 py-2.5 pr-3">{y}</td>
                  {months.map((count: number, mi: number) => (
                    <td key={mi} className="py-2.5 px-1">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-semibold text-slate-700">{count || <span className="text-slate-300">—</span>}</span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: monthlyGrid.maxVal > 0 ? `${(count / monthlyGrid.maxVal) * 100}%` : '0%', backgroundColor: colors[yi] || '#94a3b8' }} />
                        </div>
                      </div>
                    </td>
                  ))}
                  <td className="text-[12px] font-bold text-slate-900 text-center py-2.5 pl-2">{total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      </>}

    </div>
  )
}
