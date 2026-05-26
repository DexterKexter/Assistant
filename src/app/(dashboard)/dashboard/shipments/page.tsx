'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Search, Ship, X, Filter, Plus, BookOpen, Check, Save, DollarSign, User, Building2, Truck, Send } from 'lucide-react'
import { ReferencesModal } from '@/components/references-modal'
import { SearchableSelect } from '@/components/searchable-select'
import { getShipmentStatus, type Shipment } from '@/types/database'
import { getOrderedRouteLegs } from '@/lib/shipment-route'
import { NewShipmentRoute } from '@/components/new-shipment-route'
import { fmtDate } from '@/lib/utils'
import { useShipmentModal } from '@/lib/shipment-modal'
import { useProfile } from '@/lib/useProfile'

function RoutePoint({ label, flag, date, onChange, variant, canEdit }: {
  label: string
  flag?: string
  date: string | null
  onChange: (date: string) => Promise<void>
  variant: 'origin' | 'transshipment' | 'border' | 'dest'
  canEdit: boolean
}) {
  const [saving, setSaving] = useState(false)
  const inputId = `date-${Math.random().toString(36).slice(2)}`

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit || date) return
    const input = document.getElementById(inputId) as HTMLInputElement | null
    input?.showPicker?.()
  }

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value) return
    setSaving(true)
    await onChange(value)
    setSaving(false)
  }

  const hasDate = !!date
  const dotByVariant =
    variant === 'origin' ? 'bg-indigo-500 ring-indigo-100' :
    variant === 'transshipment' ? 'bg-violet-500 ring-violet-100' :
    variant === 'border' ? 'bg-amber-500 ring-amber-100' :
    'bg-emerald-500 ring-emerald-100'
  const labelColor = hasDate ? 'text-slate-800 font-medium' : 'text-slate-400'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canEdit || hasDate}
      title={hasDate ? `${label} · ${fmtDate(date)}` : canEdit ? `Добавить дату для ${label}` : label}
      className={`group/rp inline-flex flex-col items-start gap-0.5 text-[12px] shrink-0 min-w-0 transition-all ${
        !hasDate && canEdit ? 'cursor-pointer' : ''
      } ${saving ? 'opacity-50' : ''}`}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className={`w-2 h-2 rounded-full ring-4 shrink-0 ${hasDate ? dotByVariant : 'bg-slate-200 ring-slate-50'}`} />
        {flag && <span className="shrink-0 text-[13px] leading-none">{flag}</span>}
        <span className={`truncate max-w-[100px] text-[12.5px] ${labelColor} ${!hasDate && canEdit ? 'group-hover/rp:text-indigo-500' : ''}`}>{label}</span>
      </span>
      {hasDate ? (
        <span className="ml-[14px] text-[10.5px] font-semibold text-slate-500 tabular-nums tracking-tight">
          {fmtDate(date)?.slice(0, 5)}
        </span>
      ) : canEdit ? (
        <span className="ml-[14px] text-[10.5px] text-slate-300 italic">+ дата</span>
      ) : null}
      <input id={inputId} type="date" className="sr-only" onChange={handleDateChange} onClick={e => e.stopPropagation()} />
    </button>
  )
}

const CITY_FLAGS: Record<string, string> = {
  'Дубай': '🇦🇪', 'Чингдао': '🇨🇳', 'Гуаньчжоу': '🇨🇳', 'Шанхай': '🇨🇳', 'Шэньчжень': '🇨🇳',
  'Тяньцзинь': '🇨🇳', 'Чуньцинь': '🇨🇳', 'Чэнгду': '🇨🇳', 'Дэчжоу': '🇨🇳', 'Чжуншань': '🇨🇳',
  'Гонконг': '🇭🇰', 'Тайвань': '🇹🇼', 'Корея': '🇰🇷', 'Пусан': '🇰🇷',
  'Япония': '🇯🇵', 'Иокохама': '🇯🇵', 'Иокохама, Япония': '🇯🇵', 'Иокохама Япония': '🇯🇵',
  'Германия': '🇩🇪', 'США': '🇺🇸', 'Австралия': '🇦🇺', 'Швейцария': '🇨🇭', 'Шри Ланка': '🇱🇰',
  'Алматы': '🇰🇿', 'Астана': '🇰🇿', 'Шымкент': '🇰🇿', 'Актау': '🇰🇿', 'Актобе': '🇰🇿',
  'Караганды': '🇰🇿', 'Кызылорда': '🇰🇿', 'Семей': '🇰🇿', 'Оскемен': '🇰🇿', 'Тараз': '🇰🇿',
  'Петропавл': '🇰🇿', 'Каскелен': '🇰🇿',
  'Москва': '🇷🇺', 'Челябинск': '🇷🇺', 'Новосибирск': '🇷🇺', 'Екатеринбург': '🇷🇺',
  'Красноярск': '🇷🇺', 'Омск': '🇷🇺', 'Барнаул': '🇷🇺', 'Иркутск': '🇷🇺', 'Краснодар': '🇷🇺',
  'Тула': '🇷🇺', 'Санкт-Петербург': '🇷🇺', 'Тольятти': '🇷🇺', 'Самара': '🇷🇺', 'Ростов': '🇷🇺',
  'Тюмень': '🇷🇺', 'Бийск': '🇷🇺', 'Махачкала': '🇷🇺', 'Грозный': '🇷🇺', 'Киров': '🇷🇺',
  'Брянск': '🇷🇺', 'Симферополь': '🇷🇺',
  'Минск': '🇧🇾', 'Пинск': '🇧🇾',
  'Актау Порт': '🇰🇿', 'Алтынколь': '🇰🇿', 'Алтынкол': '🇰🇿', 'Достык': '🇰🇿',
  'Сары-агаш': '🇰🇿', 'Темир-Баба': '🇹🇲', 'Калжат': '🇰🇿',
}
function getFlag(city: string | null): string {
  if (!city) return ''
  if (CITY_FLAGS[city.trim()]) return CITY_FLAGS[city.trim()]
  for (const [k, v] of Object.entries(CITY_FLAGS)) {
    if (city.toLowerCase().includes(k.toLowerCase())) return v
  }
  return ''
}

// Русские числительные: 1 перевозка, 2 перевозки, 5 перевозок
function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return many
  if (m10 === 1) return one
  if (m10 >= 2 && m10 <= 4) return few
  return many
}

function Hl({ text, q }: { text: string; q: string }) {
  if (!q || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return <>{text.slice(0, idx)}<mark className="bg-yellow-200/80 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
}

interface RefLookups {
  clients: { id: string; name: string }[]
  carriers: { id: string; name: string }[]
  recipients: { id: string; name: string }[]
  refs: Record<string, string[]>
}

export default function ShipmentsPage() {
  const PAGE_SIZE = 50
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const router = useRouter()
  const { openShipment } = useShipmentModal()
  const supabase = createClient()
  const { hasRole } = useProfile()
  const canEdit = hasRole('admin', 'manager')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showRefs, setShowRefs] = useState(false)

  // Inline new row
  const [addingNew, setAddingNew] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, string>>({})
  const [savingNew, setSavingNew] = useState(false)
  const [lookups, setLookups] = useState<RefLookups | null>(null)

  // Hide the mobile bottom nav while the new-shipment sheet is open
  useEffect(() => {
    if (addingNew) document.documentElement.setAttribute('data-chat-open', 'true')
    else document.documentElement.removeAttribute('data-chat-open')
    return () => document.documentElement.removeAttribute('data-chat-open')
  }, [addingNew])

  const fetchPage = async (from: number, append: boolean) => {
    if (append) setLoadingMore(true)
    let query = supabase
      .from('shipments')
      .select('id, container_number, container_size, container_type, origin, transshipment_location, transshipment_date, transshipment_position, destination_station, destination_city, departure_date, arrival_date, delivery_date, is_completed, client_id, carrier_id, sender_name, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name)', { count: 'estimated' })

    if (carrierFilter) query = query.eq('carrier_id', carrierFilter)
    if (clientFilter) query = query.eq('client_id', clientFilter)
    if (dateFrom) query = query.gte('departure_date', dateFrom)
    if (dateTo) query = query.lte('departure_date', dateTo)
    if (statusFilter === 'delivered') query = query.eq('is_completed', true)
    else if (statusFilter === 'in_transit') query = query.eq('is_completed', false).not('departure_date', 'is', null).is('arrival_date', null)
    else if (statusFilter === 'border') query = query.eq('is_completed', false).not('arrival_date', 'is', null).is('delivery_date', null)

    const { data, count } = await query
      .order('departure_date', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)

    const rows = (data as unknown as Shipment[]) || []
    setShipments(append ? prev => [...prev, ...rows] : rows)
    setTotalCount(count || 0)
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    const init = async () => {
      const [, { data: carrierData }, { data: clientData }] = await Promise.all([
        fetchPage(0, false),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('clients').select('id, name').order('name').limit(300),
      ])
      setCarriers(carrierData || [])
      setClients(clientData || [])
    }
    init()
  }, [])

  // Refetch when server-side filters change (debounced via filter state changes only)
  useEffect(() => {
    if (loading) return
    setLoading(true)
    fetchPage(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, carrierFilter, clientFilter, dateFrom, dateTo])

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    fetchPage(shipments.length, true)
  }

  const fetchLookups = async () => {
    if (lookups) return
    const [{ data: cl }, { data: ca }, { data: re }, { data: refData }, { data: stats }] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('carriers').select('id, name').order('name'),
      supabase.from('recipients').select('id, name').order('name'),
      supabase.from('reference_items').select('category, name').order('name'),
      supabase.from('shipments').select('client_id,carrier_id,recipient_id,sender_name,origin,destination_station,destination_city,cargo_description').limit(10000),
    ])

    // Count usage per value to sort by popularity
    const counts = {
      client_id: new Map<string, number>(),
      carrier_id: new Map<string, number>(),
      recipient_id: new Map<string, number>(),
      sender_name: new Map<string, number>(),
      origin: new Map<string, number>(),
      destination_station: new Map<string, number>(),
      destination_city: new Map<string, number>(),
      cargo_description: new Map<string, number>(),
    }
    ;(stats || []).forEach((s: Record<string, unknown>) => {
      ;(Object.keys(counts) as (keyof typeof counts)[]).forEach(k => {
        const v = s[k]
        if (v != null && v !== '') counts[k].set(String(v), (counts[k].get(String(v)) || 0) + 1)
      })
    })

    const sortByCount = <T extends { id?: string; name: string }>(arr: T[], countMap: Map<string, number>, key: 'id' | 'name'): T[] =>
      [...arr].sort((a, b) => {
        const ka = key === 'id' ? (a.id || '') : a.name
        const kb = key === 'id' ? (b.id || '') : b.name
        return (countMap.get(kb) || 0) - (countMap.get(ka) || 0) || a.name.localeCompare(b.name)
      })

    // Group refs and sort each category by its corresponding popularity map
    const refs: Record<string, string[]> = {}
    ;(refData || []).forEach((r: { category: string; name: string }) => {
      if (!refs[r.category]) refs[r.category] = []
      refs[r.category].push(r.name)
    })
    // city ref is used for both origin and destination_city — combine counts
    const cityCombined = new Map<string, number>()
    counts.origin.forEach((v, k) => cityCombined.set(k, (cityCombined.get(k) || 0) + v))
    counts.destination_city.forEach((v, k) => cityCombined.set(k, (cityCombined.get(k) || 0) + v))
    const refSortKeyMap: Record<string, Map<string, number>> = {
      city: cityCombined,
      station: counts.destination_station,
      sender: counts.sender_name,
      cargo: counts.cargo_description,
    }
    Object.keys(refs).forEach(cat => {
      const m = refSortKeyMap[cat]
      if (m) refs[cat].sort((a, b) => (m.get(b) || 0) - (m.get(a) || 0) || a.localeCompare(b))
    })

    setLookups({
      clients: sortByCount(cl || [], counts.client_id, 'id'),
      carriers: sortByCount(ca || [], counts.carrier_id, 'id'),
      recipients: sortByCount(re || [], counts.recipient_id, 'id'),
      refs,
    })
  }

  const updateDate = async (id: string, field: 'departure_date' | 'transshipment_date' | 'arrival_date' | 'delivery_date', value: string) => {
    const update: Record<string, string | boolean> = { [field]: value }
    if (field === 'delivery_date' && value) update.is_completed = true
    await supabase.from('shipments').update(update).eq('id', id)
    setShipments(prev => prev.map(s => s.id === id ? { ...s, [field]: value, ...(field === 'delivery_date' && value ? { is_completed: true } : {}) } : s))
  }

  const startAddNew = async () => {
    await fetchLookups()
    const today = new Date().toISOString().split('T')[0]
    setNewRow({ container_size: '40', container_type: 'Выкупной', departure_date: today })
    setAddingNew(true)
  }

  const cancelNew = () => { setAddingNew(false); setNewRow({}) }


  const saveNew = async () => {
    if (!newRow.container_number?.trim()) return
    setSavingNew(true)
    const payload: Record<string, unknown> = {}
    const numFields = ['container_size']
    const transPos = newRow.transshipment_position
    for (const [k, v] of Object.entries(newRow)) {
      if (!v) continue
      if ((k === 'transshipment_location' || k === 'transshipment_date') && transPos !== 'before_border' && transPos !== 'after_border') continue
      if (k === 'transshipment_position' && v !== 'before_border' && v !== 'after_border') continue
      payload[k] = numFields.includes(k) ? Number(v) : v
      if (k === 'client_id' || k === 'carrier_id' || k === 'recipient_id') {
        payload[k] = v || null
      }
    }
    const { data, error } = await supabase.from('shipments').insert(payload).select('*, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name)').single()
    if (!error && data) {
      setShipments(prev => [data as unknown as Shipment, ...prev])
    }
    setAddingNew(false)
    setNewRow({})
    setSavingNew(false)
  }

  const setNew = (k: string, v: string) => setNewRow(prev => ({ ...prev, [k]: v }))

  // Status/carrier/client/date filters are applied server-side. Only search is client-side (on loaded rows).
  const filtered = useMemo(() => {
    if (!search) return shipments
    const q = search.toLowerCase()
    return shipments.filter(s =>
      (s.container_number || '').toLowerCase().includes(q) ||
      ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
      ((s.carrier as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
      (s.sender_name || '').toLowerCase().includes(q) ||
      ((s.recipient as unknown as { name: string })?.name || '').toLowerCase().includes(q)
    )
  }, [shipments, search])

  const activeFiltersCount = [carrierFilter, clientFilter, dateFrom, dateTo].filter(Boolean).length
  const clearFilters = () => { setCarrierFilter(''); setClientFilter(''); setDateFrom(''); setDateTo('') }

  const statusFilters = [
    { key: 'all', label: 'Все' },
    { key: 'in_transit', label: 'В пути' },
    { key: 'border', label: 'На границе' },
    { key: 'transit_kz', label: 'Транзит КЗ' },
    { key: 'delivered', label: 'Доставлен' },
  ]

  const inpCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Перевозки</h1>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Контейнер, клиент..."
            className="w-full h-9 rounded-lg bg-white border border-slate-200/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-[13px] text-slate-400 shrink-0 hidden md:block">{shipments.length} из {totalCount}</p>
        <button onClick={() => setShowRefs(true)} className="h-9 flex items-center gap-1.5 px-3 bg-white border border-slate-200 text-slate-700 rounded-lg text-[12px] font-medium hover:bg-slate-50 transition-colors shrink-0">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Справочники</span>
        </button>
        {canEdit && (
          <button onClick={startAddNew} className="h-10 flex items-center gap-2 px-4 bg-slate-900 text-white rounded-lg text-[13px] font-semibold hover:bg-slate-800 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Новая</span>
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
        {statusFilters.map((f) => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-[6px] rounded-md text-[12px] font-medium transition-all duration-150 ${statusFilter === f.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* New shipment sheet */}
      {addingNew && lookups && (() => {
        const size = newRow.container_size || '40'
        const type = newRow.container_type || 'Выкупной'
        const typeColors: Record<string, { bg: string; ring: string; text: string; door: string }> = {
          'Выкупной':    { bg: 'from-indigo-500 to-indigo-700',     ring: 'ring-indigo-300',  text: 'text-indigo-700',  door: 'bg-indigo-900' },
          'Возвратный':  { bg: 'from-amber-500 to-amber-600',       ring: 'ring-amber-300',   text: 'text-amber-700',   door: 'bg-amber-900' },
          'Собственный': { bg: 'from-emerald-500 to-emerald-600',   ring: 'ring-emerald-300', text: 'text-emerald-700', door: 'bg-emerald-900' },
          'Малшы':       { bg: 'from-violet-500 to-violet-600',     ring: 'ring-violet-300',  text: 'text-violet-700',  door: 'bg-violet-900' },
        }
        const c = typeColors[type] || typeColors['Выкупной']
        const containerMaxW = size === '40' ? 'max-w-[420px]' : 'max-w-[210px]'
        return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4" onClick={cancelNew}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full md:max-w-[1100px] md:w-[90vw] mx-3 mb-3 md:mb-0 md:mx-0 rounded-[28px] bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 backdrop-blur-[24px] backdrop-saturate-200 border border-white/60 shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] animate-in slide-in-from-bottom md:zoom-in-95 duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-300/70" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-white/60">
              <p className="text-[15px] font-bold text-slate-900 font-heading">Новая перевозка</p>
              <button onClick={cancelNew} className="w-8 h-8 rounded-full bg-white/50 active:bg-white/80 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* === Container hero === */}
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5 items-center bg-white/50 rounded-2xl p-4 ring-1 ring-white/80">
                {/* Visual */}
                <div className="flex items-center justify-center min-h-[140px]">
                  <div className={`relative w-full ${containerMaxW} transition-all duration-300 ease-out`}>
                    <div className={`relative h-24 rounded-md bg-gradient-to-b ${c.bg} ring-1 ${c.ring} shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] overflow-hidden`}>
                      {/* Corrugation lines */}
                      <div className="absolute inset-0 flex flex-col justify-around pointer-events-none">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-px bg-black/15" />
                        ))}
                      </div>
                      {/* Doors right side */}
                      <div className={`absolute top-1.5 bottom-1.5 right-1.5 w-3 ${c.door} rounded-sm opacity-40`} />
                      <div className={`absolute top-1.5 bottom-1.5 right-5 w-px bg-black/20`} />
                      {/* Size badge */}
                      <div className="absolute top-2 left-3 px-2 py-0.5 rounded bg-white/95 text-[10px] font-bold tracking-wide text-slate-700 shadow-sm">
                        {size}ft
                      </div>
                      {/* Container number on side */}
                      {newRow.container_number && (
                        <div className="absolute bottom-2 left-3 right-9 px-1 py-0.5 rounded bg-black/30 text-[11px] font-mono font-bold text-white tracking-wider truncate">
                          {newRow.container_number}
                        </div>
                      )}
                    </div>
                    {/* Ground shadow */}
                    <div className="mx-4 h-1 rounded-full bg-slate-900/10 blur-sm" />
                  </div>
                </div>

                {/* Number + size + type + date */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Номер контейнера *</p>
                    <input
                      type="text"
                      value={newRow.container_number || ''}
                      onChange={e => setNew('container_number', e.target.value.toUpperCase())}
                      placeholder="XXXX0000000"
                      autoFocus
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                    />
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Размер</p>
                    <div className="flex gap-1">
                      {['20', '40'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNew('container_size', s)}
                          className={`h-7 px-3 rounded-full border text-[11px] font-medium transition-all ${
                            size === s
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {s} ft
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-4">
                      <p className="text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Тип</p>
                      <div className="flex flex-wrap gap-1">
                        {([
                          { value: 'Выкупной',    activeCls: 'bg-indigo-500 text-white border-indigo-500' },
                          { value: 'Возвратный',  activeCls: 'bg-amber-500 text-white border-amber-500' },
                          { value: 'Собственный', activeCls: 'bg-emerald-500 text-white border-emerald-500' },
                          { value: 'Малшы',       activeCls: 'bg-violet-500 text-white border-violet-500' },
                        ]).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setNew('container_type', opt.value)}
                            className={`h-7 rounded-full border text-[11px] font-medium transition-all px-2.5 ${
                              type === opt.value ? opt.activeCls : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {opt.value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Дата загрузки</p>
                      <input type="date" value={newRow.departure_date || ''} onChange={e => setNew('departure_date', e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300" />
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Товар</p>
                      <SearchableSelect options={(lookups.refs.cargo || []).map(n => ({ value: n, label: n }))} value={newRow.cargo_description || ''} onChange={v => setNew('cargo_description', v)} placeholder="Выберите..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* === Участники === */}
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2 px-1">Участники</p>
                <div className="bg-white/60 rounded-2xl p-4 ring-1 ring-white/80">
                  {/* Icons aligned with selects below (4 cols) */}
                  <div className="hidden sm:grid grid-cols-4 gap-3 mb-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.client_id ? 'bg-indigo-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Клиент</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.recipient_id ? 'bg-violet-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Получатель</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.carrier_id ? 'bg-amber-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Перевозчик</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.sender_name ? 'bg-emerald-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                        <Send className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Отправитель</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <SearchableSelect options={lookups.clients.map(c => ({ value: c.id, label: c.name }))} value={newRow.client_id || ''} onChange={v => setNew('client_id', v)} placeholder="Клиент" />
                    <SearchableSelect options={lookups.recipients.map(r => ({ value: r.id, label: r.name }))} value={newRow.recipient_id || ''} onChange={v => setNew('recipient_id', v)} placeholder="Получатель" />
                    <SearchableSelect options={lookups.carriers.map(c => ({ value: c.id, label: c.name }))} value={newRow.carrier_id || ''} onChange={v => setNew('carrier_id', v)} placeholder="Перевозчик" />
                    <SearchableSelect options={(lookups.refs.sender || []).map(n => ({ value: n, label: n }))} value={newRow.sender_name || ''} onChange={v => setNew('sender_name', v)} placeholder="Отправитель" />
                  </div>
                </div>
              </div>

              {/* === Маршрут === */}
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2 px-1">Маршрут</p>
                <div className="bg-white/60 rounded-2xl p-4 ring-1 ring-white/80">
                  {lookups && (
                    <NewShipmentRoute
                      row={newRow}
                      setField={setNew}
                      cityOptions={(lookups.refs.city || []).map(n => ({ value: n, label: n }))}
                      stationOptions={(lookups.refs.station || []).map(n => ({ value: n, label: n }))}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
        )
      })()}

      {/* Desktop Table */}
      <div className={`hidden md:block rounded-2xl bg-white ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden ${addingNew ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[880px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-slate-50/95 to-slate-50/80 backdrop-blur-sm border-b border-slate-200/70">
              <th className="text-left pl-5 pr-2 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[15%]">Контейнер</th>
              <th className="text-left px-2 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[8%]">Дата</th>
              <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[16%]">Клиент</th>
              <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[12%]">Перевозчик</th>
              <th className="text-left px-3 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em]" colSpan={3}>Маршрут</th>
              <th className="text-center px-2 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[7%]">Срок</th>
              <th className="text-left pl-2 pr-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.06em] w-[10%]">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-4"><div className="space-y-2.5">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-20 text-center">
                <Ship className="w-12 h-12 text-slate-200 mx-auto mb-3" strokeWidth={1.3} />
                <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
                <p className="text-[12px] text-slate-300 mt-1">Попробуйте изменить фильтры</p>
              </td></tr>
            ) : (() => {
              let lastMonth = ''
              const monthCounts: Record<string, number> = {}
              for (const s of filtered) {
                const k = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : '—'
                monthCounts[k] = (monthCounts[k] || 0) + 1
              }
              return filtered.map((s) => {
                const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
                const status = getShipmentStatus(s, isRussia)
                const curMonth = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : '—'
                const showHeader = curMonth !== lastMonth
                if (showHeader) lastMonth = curMonth

                return (
                  <Fragment key={s.id}>
                    {showHeader && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={9} className="px-5 py-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.08em]">{curMonth}</span>
                            <span className="text-[11px] text-slate-400 tabular-nums">·  {monthCounts[curMonth]} {pluralRu(monthCounts[curMonth], 'перевозка', 'перевозки', 'перевозок')}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr
                      className="group/row relative border-b border-slate-100/70 cursor-pointer transition-all duration-150 hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-transparent"
                      onClick={() => openShipment(s.id)}
                    >
                      {/* Container */}
                      <td className="pl-5 pr-2 py-3.5 relative">
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-400 to-violet-500 opacity-0 group-hover/row:opacity-100 transition-opacity rounded-r" />
                        <p className="text-[13.5px] font-bold text-slate-900 font-mono tracking-tight tabular-nums">
                          <Hl text={s.container_number || '—'} q={search} />
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {s.container_size ? (
                            <span className={`inline-block rounded-[5px] px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${s.container_size === 20 ? 'bg-sky-50 text-sky-700 ring-sky-200/60' : 'bg-violet-50 text-violet-700 ring-violet-200/60'}`}>
                              {s.container_size}ft
                            </span>
                          ) : null}
                          {s.container_type ? (
                            <span className={`inline-block rounded-[5px] px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${
                              s.container_type === 'Выкупной' ? 'bg-amber-50 text-amber-700 ring-amber-200/60' :
                              s.container_type === 'Возвратный' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' :
                              s.container_type === 'Собственный' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/60' :
                              'bg-slate-100 text-slate-600 ring-slate-200/60'
                            }`}>
                              {s.container_type}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-2 py-3.5 text-[12.5px] text-slate-600 tabular-nums font-medium whitespace-nowrap">
                        {fmtDate(s.departure_date) || <span className="text-slate-300">—</span>}
                      </td>
                      {/* Client */}
                      <td className="px-3 py-3.5">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          <Hl text={(s.client as unknown as { name: string })?.name || '—'} q={search} />
                        </p>
                        {isRussia && <p className="text-[10.5px] text-rose-500 font-medium mt-0.5">🇷🇺 РФ</p>}
                      </td>
                      {/* Carrier */}
                      <td className="px-3 py-3.5 text-[12.5px] text-slate-500 truncate">
                        <Hl text={(s.carrier as unknown as { name: string })?.name || '—'} q={search} />
                      </td>
                      {/* Route */}
                      <td className="px-3 py-3.5" colSpan={3} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-1 min-w-0 w-full">
                          {getOrderedRouteLegs(s).map((leg, legIdx) => {
                            const variant = leg.kind === 'transshipment' ? 'transshipment' as const
                              : leg.kind === 'border' ? 'border' as const
                              : leg.kind === 'delivery' ? 'dest' as const
                              : 'origin' as const
                            const dateField = leg.dateField!
                            return (
                              <Fragment key={`${s.id}-${leg.kind}-${legIdx}`}>
                                {legIdx > 0 && (
                                  <div className={`flex-1 min-w-[10px] mt-[3px] h-[1.5px] ${leg.kind === 'transshipment' ? 'bg-gradient-to-r from-indigo-100 to-violet-100' : 'bg-gradient-to-r from-indigo-100 via-amber-100 to-emerald-100'}`} />
                                )}
                                <RoutePoint
                                  label={leg.location || '—'}
                                  flag={leg.kind === 'origin' || leg.kind === 'delivery' ? getFlag(leg.location) : undefined}
                                  date={leg.date}
                                  variant={variant}
                                  canEdit={canEdit}
                                  onChange={(d) => updateDate(s.id, dateField, d)}
                                />
                              </Fragment>
                            )
                          })}
                        </div>
                      </td>
                      {/* Days */}
                      <td className="px-2 py-3.5 text-center">
                        {(() => {
                          if (status.key === 'delivered') return (
                            <span className="inline-flex items-center justify-center w-7 h-6 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-bold ring-1 ring-emerald-200/60">✓</span>
                          )
                          if (!s.departure_date) return <span className="text-[11px] text-slate-300">—</span>
                          const days = Math.floor((Date.now() - new Date(s.departure_date).getTime()) / 86400000)
                          const isLong = days > 45
                          const isWarn = days > 30 && !isLong
                          const cls = isLong
                            ? 'bg-red-50 text-red-600 ring-red-200/60'
                            : isWarn
                              ? 'bg-amber-50 text-amber-700 ring-amber-200/60'
                              : 'bg-slate-50 text-slate-600 ring-slate-200/60'
                          return (
                            <span className={`inline-flex items-center justify-center min-w-[34px] px-1.5 h-6 rounded-md text-[11px] font-bold tabular-nums ring-1 ${cls}`}>
                              {days}д
                            </span>
                          )
                        })()}
                      </td>
                      {/* Status */}
                      <td className="pl-2 pr-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset"
                          style={{
                            background: status.color + '12',
                            color: status.color,
                            borderColor: status.color + '20',
                          }}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'dot-pulse' : ''}`}
                            style={{ background: status.color }}
                          />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  </Fragment>
                )
              })
            })()}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className={`md:hidden space-y-2 ${addingNew ? 'opacity-40 pointer-events-none' : ''}`}>
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
          </div>
        ) : (() => {
          let lastMonth = ''
          return filtered.map((s) => {
            const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
            const status = getShipmentStatus(s, isRussia)
            const curMonth = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : ''
            const showMonthHeader = curMonth && curMonth !== lastMonth
            if (showMonthHeader) lastMonth = curMonth
            const statusBg = status.key === 'delivered' ? '#f0fdf4' : status.key === 'in_transit' ? '#eef2ff' : status.key === 'transshipment' ? '#f5f3ff' : '#fffbeb'

            return (
              <div key={s.id}>
                {showMonthHeader && (
                  <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide px-1 pt-3 pb-1.5">{curMonth}</p>
                )}
                <div
                  className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] p-3.5 active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => openShipment(s.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-900 font-mono"><Hl text={s.container_number || '—'} q={search} /></p>
                      <p className="text-[12px] text-slate-500 truncate mt-0.5">{(s.client as unknown as { name: string })?.name || '—'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0" style={{ background: statusBg, color: status.color }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'dot-pulse' : ''}`} style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{getFlag(s.origin)} {s.origin || '—'} → {getFlag(s.destination_city || s.destination_station)} {s.destination_city || s.destination_station || '—'}</span>
                    <span className="ml-auto">{fmtDate(s.departure_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {s.container_size && <span className={`rounded px-1.5 py-px text-[10px] font-medium ${s.container_size === 20 ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>{s.container_size}ft</span>}
                    {s.container_type && <span className={`rounded px-1.5 py-px text-[10px] font-medium ${
                      s.container_type === 'Выкупной' ? 'bg-amber-50 text-amber-700' :
                      s.container_type === 'Возвратный' ? 'bg-emerald-50 text-emerald-700' :
                      s.container_type === 'Собственный' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{s.container_type}</span>}
                    {(s.carrier as unknown as { name: string })?.name && <span className="text-[11px] text-slate-400 ml-auto truncate max-w-[120px]">{(s.carrier as unknown as { name: string })?.name}</span>}
                  </div>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center py-3">
          <button onClick={loadMore} disabled={loadingMore}
            className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
            {loadingMore ? 'Загрузка...' : `Ещё ${Math.min(PAGE_SIZE, totalCount - shipments.length)} из ${totalCount - shipments.length}`}
          </button>
        </div>
      )}

      {showRefs && <ReferencesModal onClose={() => setShowRefs(false)} />}
    </div>
  )
}