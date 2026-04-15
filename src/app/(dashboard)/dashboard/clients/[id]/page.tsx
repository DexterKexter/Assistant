'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useShipmentModal } from '@/lib/shipment-modal'
import { type Client, type Shipment, type Transaction, getShipmentStatus } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import {
  ArrowLeft, Phone, MapPin, Globe, Ship, Package, TrendingUp, Calendar,
  DollarSign, Clock, ChevronRight, Container, Truck, CheckCircle2, Search,
  Pencil, X as XIcon, Save
} from 'lucide-react'
import { useProfile } from '@/lib/useProfile'

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { openShipment } = useShipmentModal()
  const [client, setClient] = useState<Client | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activityYear, setActivityYear] = useState<string>('all')
  const [shipmentSearch, setShipmentSearch] = useState('')

  // Edit modal
  const { hasRole } = useProfile()
  const canEdit = hasRole('admin', 'manager')
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<{ name: string; phone: string; address: string; is_russia: boolean }>({
    name: '', phone: '', address: '', is_russia: false,
  })
  const [saving, setSaving] = useState(false)

  const openEdit = () => {
    if (!client) return
    setDraft({
      name: client.name || '',
      phone: client.phone || '',
      address: client.address || '',
      is_russia: !!client.is_russia,
    })
    setEditOpen(true)
  }

  // Hide the mobile bottom nav while the edit modal is open
  useEffect(() => {
    if (editOpen) document.documentElement.setAttribute('data-chat-open', 'true')
    else document.documentElement.removeAttribute('data-chat-open')
    return () => document.documentElement.removeAttribute('data-chat-open')
  }, [editOpen])
  const saveEdit = async () => {
    if (!client) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .update({
        name: draft.name.trim() || client.name,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        is_russia: draft.is_russia,
      })
      .eq('id', client.id)
      .select()
      .single()
    if (data) setClient(data as Client)
    setSaving(false)
    setEditOpen(false)
  }

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const [{ data: c }, { data: sh }, { data: tr }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('shipments').select('*, carrier:carriers(name)').eq('client_id', id).order('departure_date', { ascending: false }),
        supabase.from('transactions').select('*').eq('client_id', id).order('date', { ascending: false }),
      ])
      setClient(c)
      setShipments((sh || []) as any)
      setTransactions(tr || [])
      setLoading(false)
    }
    load()
  }, [id])

  // ── Analytics ──
  const analytics = useMemo(() => {
    if (!shipments.length) return null

    const total = shipments.length
    const delivered = shipments.filter(s => s.delivery_date || s.is_completed).length
    const inTransit = shipments.filter(s => s.departure_date && !s.arrival_date && !s.delivery_date && !s.is_completed).length
    const atBorder = shipments.filter(s => s.arrival_date && !s.delivery_date && !s.is_completed).length

    // Avg delivery time
    const withBoth = shipments.filter(s => s.departure_date && s.delivery_date)
    const avgDays = withBoth.length > 0
      ? Math.round(withBoth.reduce((sum, s) => sum + (new Date(s.delivery_date!).getTime() - new Date(s.departure_date!).getTime()) / 86400000, 0) / withBoth.length)
      : 0

    // Top origin
    const origins: Record<string, number> = {}
    shipments.forEach(s => { if (s.origin) origins[s.origin] = (origins[s.origin] || 0) + 1 })
    const topOrigin = Object.entries(origins).sort(([, a], [, b]) => b - a)[0]

    // Top carrier
    const carriers: Record<string, number> = {}
    shipments.forEach(s => { const name = (s as any).carrier?.name; if (name) carriers[name] = (carriers[name] || 0) + 1 })
    const topCarrier = Object.entries(carriers).sort(([, a], [, b]) => b - a)[0]

    // Container sizes
    const size20 = shipments.filter(s => s.container_size === 20).length
    const size40 = shipments.filter(s => s.container_size === 40).length

    // Available years
    const yearsSet = new Set<string>()
    shipments.forEach(s => { if (s.departure_date) yearsSet.add(s.departure_date.slice(0, 4)) })
    const availableYears = Array.from(yearsSet).sort()

    // Monthly activity by selected year
    const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    const monthlyActivity: { month: string; count: number }[] = []

    if (activityYear === 'all') {
      // By year totals
      availableYears.forEach(y => {
        const count = shipments.filter(s => s.departure_date?.startsWith(y)).length
        monthlyActivity.push({ month: y, count })
      })
    } else {
      // Specific year — all 12 months
      for (let m = 0; m < 12; m++) {
        const key = `${activityYear}-${String(m + 1).padStart(2, '0')}`
        const count = shipments.filter(s => s.departure_date?.startsWith(key)).length
        monthlyActivity.push({ month: MONTH_LABELS[m], count })
      }
    }
    const maxMonthly = Math.max(...monthlyActivity.map(m => m.count), 1)

    // First & last shipment
    const dates = shipments.filter(s => s.departure_date).map(s => new Date(s.departure_date!).getTime())
    const firstShipment = dates.length ? new Date(Math.min(...dates)) : null
    const lastShipment = dates.length ? new Date(Math.max(...dates)) : null

    // Finance
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)

    return {
      total, delivered, inTransit, atBorder, avgDays,
      topOrigin, topCarrier, size20, size40,
      monthlyActivity, maxMonthly, availableYears,
      firstShipment, lastShipment,
      totalIncome, totalExpense,
    }
  }, [shipments, transactions, activityYear])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-7 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!client) return <p className="text-[13px] text-slate-400 py-10 text-center">Клиент не найден</p>

  const initials = client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <a href="/dashboard/clients" className="hover:text-slate-600 transition-colors">Клиенты</a>
        <span>/</span>
        <span className="text-slate-700 font-medium">{client.name}</span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
          {initials}
        </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-bold text-slate-900 tracking-tight font-heading truncate">{client.name}</h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${client.is_russia ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Globe className="w-3 h-3" strokeWidth={2} />
                {client.is_russia ? 'Россия' : 'Казахстан'}
              </span>
              {client.phone && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Phone className="w-3 h-3" strokeWidth={1.8} />
                  {client.phone}
                </span>
              )}
              {client.address && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 hidden md:flex">
                  <MapPin className="w-3 h-3" strokeWidth={1.8} />
                  {client.address}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={openEdit}
              aria-label="Редактировать клиента"
              className="shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all text-slate-500"
            >
              <Pencil className="w-4 h-4" strokeWidth={1.8} />
            </button>
          )}
      </div>

      {/* ── Edit modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4" onClick={() => !saving && setEditOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full md:w-[440px] mb-3 mx-3 md:mb-0 md:mx-0 rounded-[28px] bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 backdrop-blur-[24px] backdrop-saturate-200 border border-white/60 shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] animate-in slide-in-from-bottom md:zoom-in-95 duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-hidden"
          >
            <div className="flex items-center justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300/70" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-white/60">
              <h3 className="text-[15px] font-bold text-slate-900 font-heading">Редактировать клиента</h3>
              <button onClick={() => !saving && setEditOpen(false)} className="w-8 h-8 rounded-full bg-white/50 active:bg-white/80 flex items-center justify-center transition-colors">
                <XIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Имя / контактное лицо</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white"
                  placeholder="Иван Иванов"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Телефон</label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white"
                  placeholder="+7 900 000 00 00"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Адрес</label>
                <input
                  type="text"
                  value={draft.address}
                  onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white"
                  placeholder="Город, улица, дом"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Направление</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, is_russia: false }))}
                    className={`h-10 rounded-xl border text-[13px] font-medium transition-colors ${!draft.is_russia ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-700 font-semibold' : 'bg-white/50 border-white/80 text-slate-500 active:bg-white/80'}`}
                  >
                    🇰🇿 Казахстан
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, is_russia: true }))}
                    className={`h-10 rounded-xl border text-[13px] font-medium transition-colors ${draft.is_russia ? 'bg-blue-500/15 border-blue-400/50 text-blue-700 font-semibold' : 'bg-white/50 border-white/80 text-slate-500 active:bg-white/80'}`}
                  >
                    🇷🇺 Россия
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-4 pt-2 flex items-center gap-2">
              <button
                onClick={() => !saving && setEditOpen(false)}
                disabled={saving}
                className="flex-1 h-10 rounded-xl border border-white/80 bg-white/60 text-slate-600 text-[13px] font-medium active:bg-white/90 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !draft.name.trim()}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold active:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Stats Cards ── */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'Всего', fullLabel: 'Всего перевозок', value: analytics.total, icon: Ship, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Доставлено', fullLabel: 'Доставлено', value: analytics.delivered, icon: CheckCircle2, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'В пути', fullLabel: 'В пути', value: analytics.inTransit, icon: Truck, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Ср. время', fullLabel: 'Среднее время', value: `${analytics.avgDays} д`, icon: Clock, color: '#8b5cf6', bg: '#f5f3ff' },
          ].map(stat => (
            <div key={stat.fullLabel} className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-3 md:p-4 flex items-center gap-2.5 md:flex-col md:items-start md:gap-0">
              <div className="w-9 h-9 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0 md:mb-2" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-[18px] h-[18px] md:w-4 md:h-4" style={{ color: stat.color }} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 md:flex-none md:w-full">
                <p className="text-[9.5px] md:text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-tight mb-0.5 md:mb-2 truncate md:hidden">{stat.label}</p>
                <p className="hidden md:block text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-2">{stat.fullLabel}</p>
                <p className="text-[18px] md:text-[22px] font-bold text-slate-900 leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Activity chart + details */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">

          {/* Monthly activity sparkline */}
          {analytics && (
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-semibold text-slate-900">Активность</h3>
                <div className="flex items-center gap-1">
                  {['all', ...analytics.availableYears].map(y => (
                    <button
                      key={y}
                      onClick={() => setActivityYear(y)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${activityYear === y ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      {y === 'all' ? 'Все' : y}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-[140px]">
                {analytics.monthlyActivity.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative" style={{ height: 110 }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(2, (m.count / analytics.maxMonthly) * 110)}px`,
                          backgroundColor: m.count > 0 ? '#6366f1' : '#e2e8f0',
                          opacity: m.count > 0 ? 0.8 : 0.4,
                        }}
                      />
                      {m.count > 0 && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500">{m.count}</span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipments list */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200/60">
              <h3 className="text-[13px] font-semibold text-slate-900 shrink-0">Перевозки ({shipments.length})</h3>
              <div className="relative flex-1 max-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" strokeWidth={2} />
                <input
                  value={shipmentSearch}
                  onChange={e => setShipmentSearch(e.target.value)}
                  placeholder="Контейнер, маршрут..."
                  className="w-full h-7 pl-7 pr-2 rounded-md bg-white border border-slate-200/60 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            {shipments.length === 0 ? (
              <div className="py-10 text-center text-[12px] text-slate-400">Нет перевозок</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {shipments.filter(s => {
                  if (!shipmentSearch) return true
                  const q = shipmentSearch.toLowerCase()
                  return (s.container_number?.toLowerCase().includes(q)) ||
                    (s.origin?.toLowerCase().includes(q)) ||
                    (s.destination_city?.toLowerCase().includes(q)) ||
                    (s.destination_station?.toLowerCase().includes(q))
                }).map(s => {
                  const status = getShipmentStatus(s, client.is_russia)
                  return (
                    <button
                      key={s.id}
                      onClick={() => openShipment(s.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/60 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-semibold text-slate-800">{s.container_number || '—'}</span>
                          {s.container_size && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${s.container_size === 20 ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                              {s.container_size}ft
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.origin || '?'} → {s.destination_city || s.destination_station || '?'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-slate-400 tabular-nums hidden sm:block">{fmtDate(s.departure_date)}</span>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                          style={{ backgroundColor: status.color + '18', color: status.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" strokeWidth={2} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="space-y-4 order-1 lg:order-2">
          {/* Client details */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-5">
            <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Информация</h3>
            <div className="space-y-3">
              {[
                { icon: Globe, label: 'Направление', value: client.is_russia ? 'Россия' : 'Казахстан' },
                { icon: Phone, label: 'Телефон', value: client.phone || '—' },
                { icon: MapPin, label: 'Адрес', value: client.address || '—' },
                { icon: Calendar, label: 'Первая перевозка', value: analytics?.firstShipment ? analytics.firstShipment.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '—' },
                { icon: Calendar, label: 'Последняя перевозка', value: analytics?.lastShipment ? analytics.lastShipment.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <item.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="text-[12px] text-slate-700 font-medium truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics breakdown */}
          {analytics && (
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-5">
              <h3 className="text-[13px] font-semibold text-slate-900 mb-3">Аналитика</h3>
              <div className="space-y-3">
                {analytics.topOrigin && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Основной пункт отправки</p>
                    <p className="text-[13px] font-bold text-slate-800">{analytics.topOrigin[0]}</p>
                    <p className="text-[10px] text-slate-400">{analytics.topOrigin[1]} перевозок</p>
                  </div>
                )}
                {analytics.topCarrier && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Основной перевозчик</p>
                    <p className="text-[13px] font-bold text-slate-800">{analytics.topCarrier[0]}</p>
                    <p className="text-[10px] text-slate-400">{analytics.topCarrier[1]} перевозок</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Контейнеры</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-semibold">20ft: {analytics.size20}</span>
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-600 rounded text-[10px] font-semibold">40ft: {analytics.size40}</span>
                  </div>
                </div>
                {(analytics.totalIncome > 0 || analytics.totalExpense > 0) && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">Финансы</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-500">Доход</span>
                        <span className="font-bold text-emerald-600">${analytics.totalIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-500">Расход</span>
                        <span className="font-bold text-red-500">${analytics.totalExpense.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
