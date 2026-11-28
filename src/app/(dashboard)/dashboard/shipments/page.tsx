'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Ship, X, Filter, Plus, BookOpen, Check, Save, DollarSign, User, Building2, Truck, Send, Container, MapPin, LoaderCircle, ClipboardList } from 'lucide-react'
import { Place } from '@/components/place'
import { RoutePoint } from '@/components/shipment-route-point'
import { shipmentDateBounds, shipmentDateError, type ShipmentDateField } from '@/lib/shipment-dates'
import { CONTAINER_NUMBER_PATTERN, editContainerNumber } from '@/lib/container-number'
import { ReferencesModal } from '@/components/references-modal'
import { ContainerArt, containerTypeColor } from '@/components/container-art'
import { NewCargoRequest } from '@/components/new-cargo-request'
import { SearchableSelect } from '@/components/searchable-select'
import { getShipmentStatus, type Shipment } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import { useShipmentModal } from '@/lib/shipment-modal'
import { useProfile } from '@/lib/useProfile'
import { PageHeader, PageAction } from '@/components/page-header'
import { FilterBar, FilterTabs, SearchInput } from '@/components/filter-bar'


// Mobile card: colour and step of each status, and the date that matters for it.
const STAGE: Record<string, { step: number; dot: string; text: string; since: string }> = {
  loading: { step: 0, dot: 'bg-slate-400', text: 'text-slate-700', since: 'с' },
  in_transit: { step: 1, dot: 'bg-indigo-500', text: 'text-indigo-700', since: 'с' },
  border: { step: 2, dot: 'bg-amber-500', text: 'text-amber-700', since: 'с' },
  transit_kz: { step: 2, dot: 'bg-amber-500', text: 'text-amber-700', since: 'с' },
  delivered: { step: 3, dot: 'bg-emerald-500', text: 'text-emerald-700', since: '' },
}
const statusDate = (s: Shipment, key: string) =>
  key === 'delivered' ? s.delivery_date : key === 'border' || key === 'transit_kz' ? s.arrival_date : s.departure_date

const CONTAINER_TYPE_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  'Выкупной': { backgroundColor: '#fef3c7', color: '#92400e' },
  'Возвратный': { backgroundColor: '#d1fae5', color: '#065f46' },
  'Собственный': { backgroundColor: '#dbeafe', color: '#1e40af' },
  'Малшы': { backgroundColor: '#ede9fe', color: '#5b21b6' },
  'Sinorail': { backgroundColor: '#ccfbf1', color: '#115e59' },
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
  return <>{text.slice(0, idx)}<mark className="bg-indigo-50 text-inherit rounded-sm">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const pageRequest = useRef<AbortController | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
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
  const [showRequest, setShowRequest] = useState(false)

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

  const fetchPage = useCallback(async (from: number, append: boolean) => {
    if (append && pageRequest.current && !pageRequest.current.signal.aborted) return
    pageRequest.current?.abort()
    const controller = new AbortController()
    pageRequest.current = controller
    setLoadError(null)
    setLoadingMore(append)
    if (!append) {
      setLoading(true)
      setHasMore(false)
      setShipments([])
      setTotalCount(0)
    }

    try {
      let query = supabase
        .from('shipments')
        .select('id, container_number, container_size, container_type, origin, destination_station, destination_city, departure_date, arrival_date, delivery_date, is_completed, client_id, carrier_id, sender_name, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name), search_client:clients(), search_carrier:carriers(), search_recipient:recipients()', { count: 'exact' })

      if (search.trim()) {
        const pattern = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`
        // Separate embeds preserve participant names when another field matches.
        query = query
          .ilike('search_client.name', pattern)
          .ilike('search_carrier.name', pattern)
          .ilike('search_recipient.name', pattern)
          .or(`container_number.ilike.${JSON.stringify(pattern)},sender_name.ilike.${JSON.stringify(pattern)},search_client.not.is.null,search_carrier.not.is.null,search_recipient.not.is.null`)
      }

      if (carrierFilter) query = query.eq('carrier_id', carrierFilter)
      if (clientFilter) query = query.eq('client_id', clientFilter)
      if (dateFrom) query = query.gte('departure_date', dateFrom)
      if (dateTo) query = query.lte('departure_date', dateTo)
      if (statusFilter === 'delivered') query = query.eq('is_completed', true)
      else if (statusFilter === 'in_transit') query = query.eq('is_completed', false).not('departure_date', 'is', null).is('arrival_date', null)
      else if (statusFilter === 'border') query = query.eq('is_completed', false).not('arrival_date', 'is', null).is('delivery_date', null)

      const { data, count, error } = await query
        .order('departure_date', { ascending: false, nullsFirst: false })
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (error) throw error
      const rows = (data as unknown as Shipment[]) || []
      setShipments(append ? prev => [...prev, ...rows] : rows)
      setTotalCount(count ?? 0)
      setHasMore(rows.length > 0 && from + rows.length < (count ?? 0))
    } catch {
      if (!controller.signal.aborted) setLoadError('Не удалось загрузить перевозки. Попробуйте ещё раз.')
    } finally {
      if (pageRequest.current === controller) pageRequest.current = null
      if (!controller.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [supabase, search, statusFilter, carrierFilter, clientFilter, dateFrom, dateTo])

  useEffect(() => {
    const init = async () => {
      const [{ data: carrierData }, { data: clientData }] = await Promise.all([
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('clients').select('id, name').order('name').limit(300),
      ])
      setCarriers(carrierData || [])
      setClients(clientData || [])
    }
    init()
  }, [supabase])

  // Cancel old searches immediately; only request once typing pauses.
  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => { void fetchPage(0, false) }, search.trim() ? 250 : 0)
    return () => {
      clearTimeout(timer)
      pageRequest.current?.abort()
    }
  }, [fetchPage, search])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || loading || loadingMore || loadError || !hasMore) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void fetchPage(shipments.length, true)
    }, { root: sentinel.closest('main'), rootMargin: '0px 0px 360px 0px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchPage, hasMore, loadError, loading, loadingMore, shipments.length])

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

  const updateDate = useCallback(async (id: string, field: ShipmentDateField, value: string) => {
    const shipment = shipments.find(s => s.id === id)
    if (!canEdit || !shipment) throw new Error('Перевозка недоступна для редактирования.')
    const validation = shipmentDateError(value, shipmentDateBounds(field, shipment))
    if (validation) throw new Error(validation)
    const update: Record<string, string | boolean> = { [field]: value }
    if (field === 'delivery_date') update.is_completed = true
    const { data, error } = await supabase.from('shipments').update(update).eq('id', id)
      .select('id, departure_date, arrival_date, delivery_date, is_completed').single()
    if (error || !data) throw new Error('Не удалось сохранить дату.')
    setShipments(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    if (field === 'departure_date' || statusFilter !== 'all') void fetchPage(0, false)
  }, [canEdit, fetchPage, shipments, statusFilter, supabase])

  const startAddNew = async () => {
    await fetchLookups()
    const today = new Date().toISOString().split('T')[0]
    setNewRow({ container_size: '40', container_type: 'Выкупной', departure_date: today })
    setAddingNew(true)
  }

  const cancelNew = () => { setAddingNew(false); setNewRow({}) }

  const saveNew = async () => {
    if (!CONTAINER_NUMBER_PATTERN.test(newRow.container_number || '')) return
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
      void fetchPage(0, false)
    }
    setAddingNew(false)
    setNewRow({})
    setSavingNew(false)
  }

  const setNew = (k: string, v: string) => setNewRow(prev => ({ ...prev, [k]: v }))

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

  const shipmentList = useMemo(() => (
    <>
      {/* Desktop Table */}
      <div className={`hidden md:block rounded-2xl border border-slate-200/70 bg-white overflow-hidden ${addingNew ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="overflow-x-auto">
        <table className="w-full table-fixed" style={{ minWidth: 1120 }}>
          <thead className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50">
            <tr className="text-left text-[11px] font-medium text-slate-500">
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '22%' }}>Контейнер</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '13%' }}>Клиент</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '11%' }}>Перевозчик</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '14%' }}>Отправление</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '14%' }}>Граница</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '14%' }}>Доставка</th>
              <th scope="col" className="px-3 py-3 font-medium" style={{ width: '12%' }}>Статус / срок</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-4"><div className="space-y-2.5">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div></td></tr>
            ) : loadError && shipments.length === 0 ? null : shipments.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-20 text-center">
                <Ship className="w-12 h-12 text-slate-200 mx-auto mb-3" strokeWidth={1.3} />
                <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
                <p className="text-[12px] text-slate-300 mt-1">Попробуйте изменить фильтры</p>
              </td></tr>
            ) : (() => {
              let lastMonth = ''
              const monthCounts: Record<string, number> = {}
              for (const s of shipments) {
                const k = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : '—'
                monthCounts[k] = (monthCounts[k] || 0) + 1
              }
              return shipments.map((s, index) => {
                const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
                const status = getShipmentStatus(s, isRussia)
                const StatusIcon = status.key === 'delivered' ? Check : status.key === 'in_transit' || status.key === 'transit_kz' ? Truck : status.key === 'border' ? MapPin : Container
                const days = s.departure_date && status.key !== 'delivered' ? Math.floor((Date.now() - new Date(s.departure_date).getTime()) / 86400000) : null
                const curMonth = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : '—'
                const showHeader = curMonth !== lastMonth
                if (showHeader) lastMonth = curMonth

                return (
                  <Fragment key={s.id}>
                    {showHeader && (
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <td colSpan={7} className="px-5 py-2">
                          <div className="flex items-baseline gap-2 text-[11px]">
                            <span className="font-medium text-slate-600 capitalize">{curMonth}</span>
                            <span className="text-slate-400 tabular-nums">· {monthCounts[curMonth]} {pluralRu(monthCounts[curMonth], 'перевозка', 'перевозки', 'перевозок')}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className={`border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} onClick={() => openShipment(s.id)}>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <button type="button" onClick={e => { e.stopPropagation(); openShipment(s.id) }}
                            aria-label={`Открыть перевозку ${s.container_number || 'без номера'}`} title={s.container_number || 'Без номера'}
                            className="inline-flex min-w-0 items-center gap-1.5 rounded text-left font-mono text-[13px] font-semibold leading-5 text-slate-900 tabular-nums hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500">
                            <Container aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                            <span className="truncate"><Hl text={s.container_number || '—'} q={search} /></span>
                          </button>
                          <div className="flex min-w-0 items-center gap-1">
                            {s.container_size && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-slate-600" title={`Размер: ${s.container_size} ft`}>
                              {s.container_size}ft
                            </span>}
                            {s.container_type && <span className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-slate-600" style={CONTAINER_TYPE_COLORS[s.container_type]} title={`Тип: ${s.container_type}`}>
                              {s.container_type}
                            </span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p title={s.client?.name || ''} className="truncate text-[13px] font-medium leading-5 text-slate-800">
                            <Hl text={s.client?.name || '—'} q={search} />
                          </p>
                          {isRussia && <span className="shrink-0 text-[10px] text-slate-400" title="Клиент из России">РФ</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p title={s.carrier?.name || ''} className="truncate text-[12px] leading-5 text-slate-500">
                          <Hl text={s.carrier?.name || '—'} q={search} />
                        </p>
                      </td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <RoutePoint label={s.origin || '—'} flag={getFlag(s.origin)} stage="Отправление" field="departure_date" dates={s} containerNumber={s.container_number} canEdit={canEdit} onChange={d => updateDate(s.id, 'departure_date', d)} />
                      </td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <RoutePoint label={s.destination_station || '—'} stage="Граница" field="arrival_date" dates={s} containerNumber={s.container_number} canEdit={canEdit} onChange={d => updateDate(s.id, 'arrival_date', d)} />
                      </td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <RoutePoint label={s.destination_city || '—'} flag={getFlag(s.destination_city)} stage="Доставка" field="delivery_date" dates={s} containerNumber={s.container_number} canEdit={canEdit} onChange={d => updateDate(s.id, 'delivery_date', d)} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <p title={status.label} className={`flex min-w-0 items-center gap-1.5 text-[12px] font-medium leading-5 ${status.key === 'delivered' ? 'text-emerald-700' : status.key === 'border' || status.key === 'transit_kz' ? 'text-amber-700' : status.key === 'in_transit' ? 'text-indigo-600' : 'text-slate-700'}`}>
                            <StatusIcon aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{status.label}</span>
                          </p>
                          {days !== null && <span className={`shrink-0 text-[11px] tabular-nums ${days > 45 ? 'text-red-600' : days > 30 ? 'text-amber-700' : 'text-slate-500'}`} title={`${days} ${pluralRu(days, 'день', 'дня', 'дней')} с даты отправления`}>
                            {days}д
                          </span>}
                        </div>
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
        ) : loadError && shipments.length === 0 ? null : shipments.length === 0 ? (
          <div className="text-center py-16">
            <Ship className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
          </div>
        ) : (() => {
          let lastMonth = ''
          return shipments.map((s) => {
            const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
            const status = getShipmentStatus(s, isRussia)
            const curMonth = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : ''
            const showMonthHeader = curMonth && curMonth !== lastMonth
            if (showMonthHeader) lastMonth = curMonth

            return (
              <div key={s.id}>
                {showMonthHeader && (
                  <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide px-1 pt-3 pb-1.5">{curMonth}</p>
                )}
                {/* Phone card. 1) container number, then client, 2) where it is (route with progress), 3) details with icons. */}
                <button type="button" onClick={() => openShipment(s.id)}
                  className="block w-full rounded-2xl bg-slate-100 p-3 text-left transition-colors active:bg-slate-200/70">
                  <div className="flex items-start gap-3">
                    {/* Container number is the headline (what a manager searches by); the client goes under it. */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                      <Container className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {s.container_number
                        ? <p className="truncate font-mono text-[16px] font-bold leading-5 tracking-wide text-slate-900"><Hl text={s.container_number} q={search} /></p>
                        : <p className="text-[15px] font-semibold leading-5 text-slate-400">Без номера</p>}
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-600">
                        <User className="size-3.5 shrink-0 text-slate-400" aria-label="Клиент" />
                        <span className="truncate">{(s.client as unknown as { name: string })?.name || 'Без клиента'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Route: origin and destination with the way between them filled up to the current step. */}
                  <div className="mt-3 rounded-xl bg-white px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
                      <span className="min-w-0 max-w-[40%] truncate"><Place name={s.origin || '—'} /></span>
                      <div className="flex flex-1 items-center gap-0.5" aria-hidden="true">
                        {[1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= (STAGE[status.key]?.step ?? 0) ? STAGE[status.key]?.dot ?? 'bg-slate-400' : 'bg-slate-200'}`} />)}
                      </div>
                      <span className="min-w-0 max-w-[40%] truncate text-right"><Place name={s.destination_city || s.destination_station || '—'} /></span>
                    </div>
                    {/* The status lives here, next to the progress it describes — no separate badge. */}
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px]">
                      <span className={`font-semibold ${STAGE[status.key]?.text ?? 'text-slate-600'}`}>{status.label}</span>
                      <span className="text-slate-500">{STAGE[status.key]?.since} {fmtDate(statusDate(s, status.key))}</span>
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-[12px] text-slate-600">
                    <Truck className="size-3.5 shrink-0 text-slate-400" aria-label="Перевозчик" />
                    <span className="min-w-0 flex-1 truncate">{(s.carrier as unknown as { name: string })?.name || 'Перевозчик не указан'}</span>
                    {s.container_type && <span className="shrink-0 text-[11px] text-slate-500">{s.container_type}</span>}
                    {s.container_size && <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${s.container_size === 20 ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>{s.container_size} ft</span>}
                  </div>
                </button>
              </div>
            )
          })
        })()}
      </div>
    </>
  ), [addingNew, canEdit, loadError, loading, openShipment, search, shipments, updateDate])

  return (
    <div className="space-y-4">
      <PageHeader title="Перевозки">
        <PageAction variant="secondary" icon={BookOpen} onClick={() => setShowRefs(true)}>Справочники</PageAction>
        {canEdit && <>
          <PageAction variant="secondary" icon={ClipboardList} onClick={() => setShowRequest(true)}>Новая заявка</PageAction>
          <PageAction icon={Plus} onClick={startAddNew}>Новая перевозка</PageAction>
        </>}
      </PageHeader>

      <FilterBar>
        <FilterTabs label="Статус перевозки" options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <p role="status" className="shrink-0 text-[12px] text-slate-500">{loading ? (search.trim() ? 'Поиск…' : 'Загрузка…') : `${shipments.length} из ${totalCount}`}</p>
          <SearchInput value={search} onChange={setSearch} placeholder="Контейнер, клиент" />
        </div>
      </FilterBar>

      {showRequest && <NewCargoRequest onClose={() => setShowRequest(false)} onCreated={failed => {
        setShowRequest(false)
        if (failed) alert('Заявка сохранена, но отправить её перевозчику в Telegram не удалось.')
      }} />}

      {/* New shipment sheet */}
      {addingNew && lookups && (() => {
        const size = newRow.container_size || '40'
        const type = newRow.container_type || 'Выкупной'
        const containerColor = containerTypeColor(type)
        return (
        <div data-overlay className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4" onClick={cancelNew}>
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
                  <ContainerArt size={size} color={containerColor} number={newRow.container_number} />
                </div>

                {/* Number + size + type + date */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="new-container-number" className="block text-[11px] text-slate-500 font-medium mb-1 uppercase tracking-wider">Номер контейнера *</label>
                    <input
                      id="new-container-number"
                      type="text"
                      value={newRow.container_number || ''}
                      onChange={e => {
                        const input = e.currentTarget
                        const caret = input.selectionStart ?? input.value.length
                        const next = editContainerNumber(input.value, newRow.container_number || '')
                        setNew('container_number', next)
                        requestAnimationFrame(() => input.setSelectionRange(Math.min(caret, next.length), Math.min(caret, next.length)))
                      }}
                      pattern="[A-Z]{4}[0-9]{7}"
                      required
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      aria-describedby="container-number-format"
                      placeholder="XXXX0000000"
                      autoFocus
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                    />
                    <p id="container-number-format" className="mt-1.5 text-[11px] text-slate-500">4 латинские буквы и 7 цифр · ABCD1234567</p>
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
                          { value: 'Sinorail',    activeCls: 'bg-indigo-500 text-white border-indigo-500' },
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
                  {/* Timeline icons aligned with selects below (4 cols) */}
                  <div className="hidden sm:block relative mb-3">
                    {/* Connector lines between adjacent route icons (1-2 and 2-3) */}
                    <div
                      className={`absolute top-5 h-0.5 ${newRow.origin && newRow.destination_station ? 'bg-slate-400' : 'bg-slate-200'}`}
                      style={{ left: 'calc(12.5% + 20px)', right: 'calc(62.5% + 20px)' }}
                    />
                    <div
                      className={`absolute top-5 h-0.5 ${newRow.destination_station && newRow.destination_city ? 'bg-slate-400' : 'bg-slate-200'}`}
                      style={{ left: 'calc(37.5% + 20px)', right: 'calc(37.5% + 20px)' }}
                    />
                    <div className="grid grid-cols-4 gap-3 relative">
                      <div className="flex flex-col items-center">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.origin ? 'bg-slate-800 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                          <Ship className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Откуда</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.destination_station ? 'bg-slate-600 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                          <Filter className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Граница</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.destination_city ? 'bg-emerald-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                          <Ship className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Доставка</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${newRow.delivery_cost ? 'bg-indigo-500 text-white shadow-md' : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'}`}>
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5">Стоимость</p>
                      </div>
                    </div>
                  </div>

                  {/* Selects + cost on same row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <SearchableSelect options={(lookups.refs.city || []).map(n => ({ value: n, label: n }))} value={newRow.origin || ''} onChange={v => setNew('origin', v)} placeholder="Пункт отправления" />
                    <SearchableSelect options={(lookups.refs.station || []).map(n => ({ value: n, label: n }))} value={newRow.destination_station || ''} onChange={v => setNew('destination_station', v)} placeholder="Погранпереход" />
                    <SearchableSelect options={(lookups.refs.city || []).map(n => ({ value: n, label: n }))} value={newRow.destination_city || ''} onChange={v => setNew('destination_city', v)} placeholder="Пункт доставки" />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium pointer-events-none">$</span>
                      <input
                        type="number"
                        placeholder="Стоимость доставки"
                        value={newRow.delivery_cost || ''}
                        onChange={e => setNew('delivery_cost', e.target.value || '')}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-3 flex items-center gap-2 border-t border-white/60 bg-white/20">
              <button onClick={cancelNew} className="flex-1 h-10 rounded-xl border border-white/80 bg-white/60 text-slate-600 text-[13px] font-medium active:bg-white/90 transition-colors">
                Отмена
              </button>
              <button
                onClick={saveNew}
                disabled={savingNew || !CONTAINER_NUMBER_PATTERN.test(newRow.container_number || '')}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold active:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25"
              >
                <Save className="w-3.5 h-3.5" /> {savingNew ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {loadError && shipments.length === 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {loadError} <button onClick={() => fetchPage(0, false)} className="font-semibold underline">Повторить</button>
      </div>}

      {shipmentList}

      {!loading && shipments.length > 0 && (
        <div ref={loadMoreRef} className="flex justify-center py-3 text-[12px] text-slate-400">
          {loadError ? (
            <div role="alert" className="flex flex-wrap items-center justify-center gap-3 text-red-600">
              <span>{loadError}</span>
              <button onClick={() => fetchPage(shipments.length, true)} className="shrink-0 font-semibold underline">Повторить</button>
            </div>
          ) : (
            <div role="status" className="flex items-center gap-2">
              {loadingMore && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              {loadingMore ? 'Загружаем перевозки…' : hasMore ? `Загружено ${shipments.length} из ${totalCount}` : 'Все перевозки загружены'}
            </div>
          )}
        </div>
      )}

      {showRefs && <ReferencesModal onClose={() => setShowRefs(false)} />}
    </div>
  )
}
