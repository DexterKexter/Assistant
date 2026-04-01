'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ship, Users, TrendingUp, Package, ArrowRight, MapPin, ArrowUpRight, ArrowDownRight, Activity, Search } from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment } from '@/types/database'

function Hl({ text, q }: { text: string; q: string }) {
  if (!q || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return <>{text.slice(0, idx)}<mark className="bg-yellow-200/80 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
}

interface MonthStats {
  shipments: number
  inTransit: number
  delivered: number
  clients: number
}

export default function DashboardPage() {
  const [cur, setCur] = useState<MonthStats>({ shipments: 0, inTransit: 0, delivered: 0, clients: 0 })
  const [prev, setPrev] = useState<MonthStats>({ shipments: 0, inTransit: 0, delivered: 0, clients: 0 })
  const [recent, setRecent] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [tableSearch, setTableSearch] = useState('')
  const router = useRouter()
  const supabaseRef = createClient()

  const updateDate = async (id: string, field: 'arrival_date' | 'delivery_date', value: string) => {
    const update: Record<string, string | boolean> = { [field]: value }
    if (field === 'delivery_date' && value) update.is_completed = true
    await supabaseRef.from('shipments').update(update).eq('id', id)
    setRecent(prev => prev.map(s => s.id === id ? { ...s, [field]: value, ...(field === 'delivery_date' && value ? { is_completed: true } : {}) } : s))
  }

  useEffect(() => {
    const supabase = createClient()
    const now = new Date()
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const fetchData = async () => {
      const [cS, cT, cD, cC, pS, pT, pD, pC, { data: rd }] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', curStart),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', curStart).is('delivery_date', null),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('delivery_date', curStart),
        supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', curStart),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', prevStart).lte('departure_date', prevEnd),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('departure_date', prevStart).lte('departure_date', prevEnd).is('delivery_date', null),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).gte('delivery_date', prevStart).lte('delivery_date', prevEnd),
        supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', prevStart).lte('created_at', prevEnd + 'T23:59:59'),
        supabase.from('shipments').select('*, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name)').order('departure_date', { ascending: false, nullsFirst: false }).limit(50),
      ])
      setCur({ shipments: cS.count || 0, inTransit: cT.count || 0, delivered: cD.count || 0, clients: cC.count || 0 })
      setPrev({ shipments: pS.count || 0, inTransit: pT.count || 0, delivered: pD.count || 0, clients: pC.count || 0 })
      setRecent((rd as unknown as Shipment[]) || [])
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
    { label: 'Перевозок', sub: 'за месяц', value: cur.shipments, prev: prev.shipments, icon: Ship, gradient: 'from-indigo-500 to-indigo-600' },
    { label: 'В пути', sub: 'активных', value: cur.inTransit, prev: prev.inTransit, icon: Package, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Доставлено', sub: 'за месяц', value: cur.delivered, prev: prev.delivered, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600' },
    { label: 'Новые клиенты', sub: 'за месяц', value: cur.clients, prev: prev.clients, icon: Users, gradient: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Обзор</h1>
        <p className="text-[13px] text-slate-400 mt-0.5 capitalize">{month} — текущий месяц</p>
      </div>

      {/* Stats — Compact */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const d = diff(card.value, card.prev)
          return (
            <div
              key={card.label}
              className="animate-fade-up bg-white rounded-xl px-4 py-3.5 border border-slate-100 card-interactive"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                  <card.icon className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[17px] font-bold text-slate-900 tracking-tight leading-none font-heading">
                      {loading ? <span className="skeleton inline-block w-10 h-6" /> : card.value.toLocaleString()}
                    </p>
                    <span className={`badge-soft text-[10px] px-1.5 py-0.5 ${d.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {d.text}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">{card.label} <span className="text-slate-300">/ пр. {card.prev}</span></p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent shipments */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3.5 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Контейнер, клиент, маршрут..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            />
          </div>
          <button
            onClick={() => router.push('/dashboard/shipments')}
            className="flex items-center gap-1.5 text-[12px] text-indigo-500 hover:text-indigo-600 font-medium transition-colors shrink-0"
          >
            Все перевозки <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table */}
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-t border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-5 py-2.5 text-[12px] font-semibold text-slate-500">Контейнер</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Загрузка</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Клиент</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Отправитель</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Перевозчик</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Сроки</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Статус</th>
              <th className="text-left px-3 py-2.5 text-[12px] font-semibold text-slate-500">Граница</th>
              <th className="text-right px-5 py-2.5 text-[12px] font-semibold text-slate-500">Доставка</th>
            </tr>
          </thead>
          <tbody>
        {loading ? (
          <tr><td colSpan={10} className="px-5 py-3"><div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div></td></tr>
        ) : recent.length === 0 ? (
          <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400 text-[13px]">Нет перевозок</td></tr>
        ) : (
          <>
            {recent.filter(s => {
              if (!tableSearch) return true
              const q = tableSearch.toLowerCase()
              return (s.container_number || '').toLowerCase().includes(q) ||
                ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
                (s.sender_name || '').toLowerCase().includes(q) ||
                ((s.carrier as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
                (s.origin || '').toLowerCase().includes(q) ||
                (s.destination_city || '').toLowerCase().includes(q)
            }).map((s, i) => {
              const isRussia = (s.client as unknown as { name: string; is_russia?: boolean })?.is_russia || false
              const getStatus = () => {
                if (s.delivery_date || s.is_completed) return { label: 'Доставлен', color: '#22c55e', bg: '#f0fdf4' }
                if (s.release_date) return { label: 'Выдан', color: '#22c55e', bg: '#f0fdf4' }
                if (s.customs_date) return { label: 'Таможня', color: '#d97706', bg: '#fffbeb' }
                if (s.arrival_date) {
                  if (isRussia) return { label: 'Транзит КЗ', color: '#d97706', bg: '#fffbeb' }
                  return { label: 'На границе', color: '#d97706', bg: '#fffbeb' }
                }
                if (s.departure_date) return { label: 'В пути', color: '#6366f1', bg: '#eef2ff' }
                return { label: 'Загрузка', color: '#94a3b8', bg: '#f8fafc' }
              }
              const status = getStatus()

              const calcDays = () => {
                if (s.arrival_date && s.delivery_date) {
                  const d = Math.round((new Date(s.delivery_date).getTime() - new Date(s.arrival_date).getTime()) / 86400000)
                  return `${d}д`
                }
                if (s.arrival_date && s.departure_date) {
                  const d = Math.round((new Date(s.arrival_date).getTime() - new Date(s.departure_date).getTime()) / 86400000)
                  return `${d}д`
                }
                if (s.departure_date) {
                  const d = Math.round((Date.now() - new Date(s.departure_date).getTime()) / 86400000)
                  return `${d}д`
                }
                return '—'
              }

              return (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                >
                  <td className="px-5 py-2">
                    <p className="text-[13px] font-semibold text-slate-900"><Hl text={s.container_number || '—'} q={tableSearch} /></p>
                    <p className="text-[11px] text-slate-400">{s.container_size ? `${s.container_size}ft` : ''} {s.container_type || ''}</p>
                  </td>
                  <td className="px-3 py-2 text-[13px] text-slate-500 whitespace-nowrap">{s.departure_date || '—'}</td>
                  <td className="px-3 py-2 text-[13px] text-slate-600 max-w-[140px] truncate"><Hl text={(s.client as unknown as { name: string })?.name || '—'} q={tableSearch} /></td>
                  <td className="px-3 py-2 text-[13px] text-slate-500 max-w-[120px] truncate"><Hl text={s.sender_name || '—'} q={tableSearch} /></td>
                  <td className="px-3 py-2 text-[13px] text-slate-500 max-w-[120px] truncate"><Hl text={(s.carrier as unknown as { name: string })?.name || '—'} q={tableSearch} /></td>
                  <td className="px-3 py-2 text-[13px] font-medium text-slate-700">{calcDays()}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: status.bg, color: status.color }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.label === 'В пути' ? 'dot-pulse' : ''}`} style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="date"
                      value={s.arrival_date || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateDate(s.id, 'arrival_date', e.target.value) }}
                      className="h-7 w-[110px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300"
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="date"
                      value={s.delivery_date || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateDate(s.id, 'delivery_date', e.target.value) }}
                      className="h-7 w-[110px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300"
                    />
                  </td>
                </tr>
              )
            })}
          </>
        )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
