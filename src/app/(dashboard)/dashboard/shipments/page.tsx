'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Search, Ship, X, Filter, Plus, BookOpen, Check, Save } from 'lucide-react'
import { ReferencesModal } from '@/components/references-modal'
import { SearchableSelect } from '@/components/searchable-select'
import { getShipmentStatus, type Shipment } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import { useShipmentModal } from '@/lib/shipment-modal'
import { useProfile } from '@/lib/useProfile'

function RoutePoint({ label, flag, date, onChange, variant, canEdit }: {
  label: string
  flag?: string
  date: string | null
  onChange: (date: string) => Promise<void>
  variant: 'origin' | 'border' | 'dest'
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
  const colorByVariant = variant === 'origin' ? 'text-indigo-600' : variant === 'border' ? 'text-amber-600' : 'text-emerald-600'
  const nameColor = hasDate ? `${colorByVariant} font-semibold` : 'text-slate-400'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canEdit || hasDate}
      title={hasDate ? `${label} · ${fmtDate(date)}` : canEdit ? `Добавить дату для ${label}` : label}
      className={`inline-flex items-center gap-1 text-[12px] shrink-0 min-w-0 transition-colors ${
        !hasDate && canEdit ? 'hover:text-indigo-500 cursor-pointer' : ''
      } ${saving ? 'opacity-50' : ''}`}
    >
      {flag && <span className="shrink-0">{flag}</span>}
      <span className={`truncate max-w-[90px] ${nameColor}`}>{label}</span>
      {hasDate && <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{fmtDate(date)?.slice(0, 5)}</span>}
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
    const { data, count } = await supabase
      .from('shipments')
      .select('id, container_number, container_size, container_type, origin, destination_station, destination_city, departure_date, arrival_date, delivery_date, is_completed, client_id, carrier_id, sender_name, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name)', { count: 'estimated' })
      .order('departure_date', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)
    const rows = (data as unknown as Shipment[]) || []
    if (append) {
      setShipments(prev => [...prev, ...rows])
    } else {
      setShipments(rows)
    }
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

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    fetchPage(shipments.length, true)
  }

  const fetchLookups = async () => {
    if (lookups) return
    const [{ data: cl }, { data: ca }, { data: re }, { data: refData }] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('carriers').select('id, name').order('name'),
      supabase.from('recipients').select('id, name').order('name'),
      supabase.from('reference_items').select('category, name').order('name'),
    ])
    const refs: Record<string, string[]> = {}
    ;(refData || []).forEach((r: { category: string; name: string }) => {
      if (!refs[r.category]) refs[r.category] = []
      refs[r.category].push(r.name)
    })
    setLookups({ clients: cl || [], carriers: ca || [], recipients: re || [], refs })
  }

  const updateDate = async (id: string, field: 'departure_date' | 'arrival_date' | 'delivery_date', value: string) => {
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
    for (const [k, v] of Object.entries(newRow)) {
      if (!v) continue
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

  const filtered = useMemo(() => {
    let results = shipments
    if (search) {
      const q = search.toLowerCase()
      results = results.filter(s =>
        (s.container_number || '').toLowerCase().includes(q) ||
        ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
        ((s.carrier as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
        (s.sender_name || '').toLowerCase().includes(q) ||
        ((s.recipient as unknown as { name: string })?.name || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      results = results.filter(s => {
        const isRu = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
        return getShipmentStatus(s, isRu).key === statusFilter
      })
    }
    if (carrierFilter) results = results.filter(s => s.carrier_id === carrierFilter)
    if (clientFilter) results = results.filter(s => s.client_id === clientFilter)
    if (dateFrom) results = results.filter(s => s.departure_date && s.departure_date >= dateFrom)
    if (dateTo) results = results.filter(s => s.departure_date && s.departure_date <= dateTo)
    return results
  }, [shipments, search, statusFilter, carrierFilter, clientFilter, dateFrom, dateTo])

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
        <button onClick={startAddNew} className="h-9 flex items-center gap-1.5 px-3 bg-slate-900 text-white rounded-lg text-[12px] font-medium hover:bg-slate-800 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Новая</span>
        </button>
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
      {addingNew && lookups && (
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
            <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Контейнер *</p>
                <div className="flex gap-1">
                  <input type="text" value={newRow.container_number || ''} onChange={e => setNew('container_number', e.target.value)}
                    placeholder="XXXX0000000" autoFocus className={inpCls + ' flex-1 font-mono font-bold'} />
                </div>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Размер / Тип</p>
                <div className="flex gap-1">
                  <select value={newRow.container_size || '40'} onChange={e => setNew('container_size', e.target.value)} className={inpCls + ' flex-1'}>
                    <option value="20">20ft</option>
                    <option value="40">40ft</option>
                  </select>
                  <select value={newRow.container_type || ''} onChange={e => setNew('container_type', e.target.value)} className={inpCls + ' flex-1'}>
                    <option value="Выкупной">Выкупной</option>
                    <option value="Возвратный">Возвратный</option>
                    <option value="Собственный">Собственный</option>
                    <option value="Малшы">Малшы</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Дата загрузки</p>
                <input type="date" value={newRow.departure_date || ''} onChange={e => setNew('departure_date', e.target.value)} className={inpCls + ' w-full'} />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Клиент</p>
                <SearchableSelect options={lookups.clients.map(c => ({ value: c.id, label: c.name }))} value={newRow.client_id || ''} onChange={v => setNew('client_id', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Перевозчик</p>
                <SearchableSelect options={lookups.carriers.map(c => ({ value: c.id, label: c.name }))} value={newRow.carrier_id || ''} onChange={v => setNew('carrier_id', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Отправитель</p>
                <SearchableSelect options={(lookups.refs.sender || []).map(n => ({ value: n, label: n }))} value={newRow.sender_name || ''} onChange={v => setNew('sender_name', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Откуда</p>
                <SearchableSelect options={(lookups.refs.city || []).map(n => ({ value: n, label: n }))} value={newRow.origin || ''} onChange={v => setNew('origin', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Погранпереход</p>
                <SearchableSelect options={(lookups.refs.station || []).map(n => ({ value: n, label: n }))} value={newRow.destination_station || ''} onChange={v => setNew('destination_station', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Город назначения</p>
                <SearchableSelect options={(lookups.refs.city || []).map(n => ({ value: n, label: n }))} value={newRow.destination_city || ''} onChange={v => setNew('destination_city', v)} placeholder="Выберите..." />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Стоимость доставки</p>
                <input type="number" placeholder="0" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300 w-full" value={newRow.delivery_cost || ''} onChange={e => setNew('delivery_cost', e.target.value || '')} />
              </div>
            </div>
            </div>
            <div className="px-5 pt-3 pb-3 flex items-center gap-2 border-t border-white/60 bg-white/20">
              <button onClick={cancelNew} className="flex-1 h-10 rounded-xl border border-white/80 bg-white/60 text-slate-600 text-[13px] font-medium active:bg-white/90 transition-colors">
                Отмена
              </button>
              <button
                onClick={saveNew}
                disabled={savingNew || !newRow.container_number?.trim()}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold active:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25"
              >
                <Save className="w-3.5 h-3.5" /> {savingNew ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className={`hidden md:block bg-white rounded-xl border border-slate-100 overflow-hidden ${addingNew ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left pl-4 pr-1 py-2.5 text-[12px] font-semibold text-slate-500 w-[14%]">Контейнер</th>
              <th className="text-left px-1 py-2.5 text-[12px] font-semibold text-slate-500 w-[8%]">Загрузка</th>
              <th className="text-left px-2 py-2.5 text-[12px] font-semibold text-slate-500">Клиент</th>
              <th className="text-left px-2 py-2.5 text-[12px] font-semibold text-slate-500">Перевозчик</th>
              <th className="text-left px-2 py-2.5 text-[12px] font-semibold text-slate-500" colSpan={3}>Маршрут</th>
              <th className="text-left px-2 py-2.5 text-[12px] font-semibold text-slate-500 w-[6%]">Дней</th>
              <th className="text-left px-2 py-2.5 text-[12px] font-semibold text-slate-500 w-[9%]">Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-3"><div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-16 text-center">
                <Ship className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
              </td></tr>
            ) : (
              <>
                {filtered.map((s, idx) => {
                  const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
                  const status = getShipmentStatus(s, isRussia)

                  return (
                    <tr key={s.id} className={`border-b border-slate-50 cursor-pointer hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      onClick={() => openShipment(s.id)}>
                      <td className="pl-4 pr-1 py-2.5">
                        <p className="text-[13px] font-semibold text-slate-800 font-mono"><Hl text={s.container_number || '—'} q={search} /></p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {s.container_size ? <span className={`inline-block rounded px-1.5 py-px text-[9px] font-semibold ${s.container_size === 20 ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'}`}>{s.container_size}ft</span> : null}
                          {s.container_type ? <span className={`inline-block rounded px-1.5 py-px text-[9px] font-semibold ${
                            s.container_type === 'Выкупной' ? 'bg-amber-50 text-amber-600' :
                            s.container_type === 'Возвратный' ? 'bg-emerald-50 text-emerald-600' :
                            s.container_type === 'Собственный' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{s.container_type}</span> : null}
                        </div>
                      </td>
                      <td className="px-1 py-2.5 text-[12px] text-slate-500 tabular-nums whitespace-nowrap">{fmtDate(s.departure_date)}</td>
                      <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700 max-w-[140px] truncate"><Hl text={(s.client as unknown as { name: string })?.name || '—'} q={search} /></td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-600 max-w-[120px] truncate"><Hl text={(s.carrier as unknown as { name: string })?.name || '—'} q={search} /></td>
                      <td className="px-3 py-2.5" colSpan={3} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 text-[12px] min-w-0">
                          <RoutePoint
                            label={s.origin || '—'}
                            flag={getFlag(s.origin)}
                            date={s.departure_date}
                            variant="origin"
                            canEdit={canEdit}
                            onChange={(d) => updateDate(s.id, 'departure_date', d)}
                          />
                          <span className="text-slate-300 shrink-0">›</span>
                          <RoutePoint
                            label={s.destination_station || '—'}
                            date={s.arrival_date}
                            variant="border"
                            canEdit={canEdit}
                            onChange={(d) => updateDate(s.id, 'arrival_date', d)}
                          />
                          <span className="text-slate-300 shrink-0">›</span>
                          <RoutePoint
                            label={s.destination_city || '—'}
                            flag={getFlag(s.destination_city)}
                            date={s.delivery_date}
                            variant="dest"
                            canEdit={canEdit}
                            onChange={(d) => updateDate(s.id, 'delivery_date', d)}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        {(() => {
                          if (status.key === 'delivered') return <span className="text-[11px] text-emerald-500 font-medium">✓</span>
                          if (!s.departure_date) return <span className="text-[11px] text-slate-300">—</span>
                          const days = Math.floor((Date.now() - new Date(s.departure_date).getTime()) / 86400000)
                          const isLong = days > 45
                          return <span className={`text-[11px] font-semibold tabular-nums ${isLong ? 'text-red-500' : 'text-slate-600'}`}>{days}д</span>
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: status.color + '15', color: status.color }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'dot-pulse' : ''}`} style={{ background: status.color }} />
                          {status.label}
                        </span>
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
            const statusBg = status.key === 'delivered' ? '#f0fdf4' : status.key === 'in_transit' ? '#eef2ff' : '#fffbeb'

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
