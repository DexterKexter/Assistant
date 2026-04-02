'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Search, Ship, ArrowRight, X, Filter, Package, FileText, Wallet, User, Users, Building2, Truck, Pencil } from 'lucide-react'
import { getShipmentStatus, type Shipment, type Carrier, type Client } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import { DetailIcon } from '@/components/detail-icon'
import { useShipmentModal } from '@/lib/shipment-modal'

const ShipmentMap = dynamic(() => import('@/components/shipment-map').then(m => ({ default: m.ShipmentMap })), { ssr: false })

function Hl({ text, q }: { text: string; q: string }) {
  if (!q || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>
  return <>{text.slice(0, idx)}<mark className="bg-yellow-200/80 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()
  const { openShipment, closeShipment, selectedId } = useShipmentModal()
  const supabase = createClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const [{ data: shipData }, { data: carrierData }, { data: clientData }] = await Promise.all([
        supabase.from('shipments').select('*, recipient:recipients(name), client:clients(name, is_russia), carrier:carriers(name), sender:senders(name)').order('departure_date', { ascending: false, nullsFirst: false }).limit(500),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('clients').select('id, name').order('name').limit(100),
      ])
      setShipments((shipData as unknown as Shipment[]) || [])
      setCarriers(carrierData || [])
      setClients(clientData || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const updateDate = async (id: string, field: 'arrival_date' | 'delivery_date', value: string) => {
    const update: Record<string, string | boolean> = { [field]: value }
    if (field === 'delivery_date' && value) update.is_completed = true
    await supabase.from('shipments').update(update).eq('id', id)
    setShipments(prev => prev.map(s => s.id === id ? { ...s, [field]: value, ...(field === 'delivery_date' && value ? { is_completed: true } : {}) } : s))
  }

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
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setCarrierFilter(''); setClientFilter(''); setDateFrom(''); setDateTo('') }

  const statusFilters = [
    { key: 'all', label: 'Все' },
    { key: 'in_transit', label: 'В пути' },
    { key: 'border', label: 'На границе' },
    { key: 'transit_kz', label: 'Транзит КЗ' },
    { key: 'delivered', label: 'Доставлен' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Перевозки</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Отслеживание контейнеров и грузов</p>
        </div>
        <p className="text-[13px] text-slate-400">{filtered.length} из {shipments.length}</p>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Контейнер, клиент, перевозчик, отправитель..."
            className="w-full h-9 rounded-lg bg-white border border-slate-200/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`h-9 px-3 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-700'}`}>
          <Filter className="w-3.5 h-3.5" /> Фильтры
          {activeFiltersCount > 0 && <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">{activeFiltersCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 animate-fade-up grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Перевозчик</label>
            <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Все</option>
              {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Клиент</label>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Все</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Дата от</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Дата до</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="col-span-full text-[12px] text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1 mt-1">
              <X className="w-3 h-3" /> Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-white rounded-lg border border-slate-200/80 w-fit">
        {statusFilters.map((f) => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-[6px] rounded-md text-[12px] font-medium transition-all duration-150 ${statusFilter === f.key ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
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
              <tr><td colSpan={9} className="px-5 py-3"><div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-16 text-center">
                <Ship className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
              </td></tr>
            ) : (
              <>
                {(() => {
                  let lastMonth = ''
                  return filtered.map((s) => {
                  const isRussia = (s.client as unknown as { is_russia?: boolean })?.is_russia || false
                  const status = getShipmentStatus(s, isRussia)
                  const curMonth = s.departure_date ? new Date(s.departure_date).toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : ''
                  const showMonthHeader = curMonth && curMonth !== lastMonth
                  if (showMonthHeader) lastMonth = curMonth
                  const statusBg = status.key === 'delivered' ? '#f0fdf4' : status.key === 'in_transit' ? '#eef2ff' : '#fffbeb'

                  const calcDays = () => {
                    if (!s.departure_date) return '—'
                    const end = s.delivery_date ? new Date(s.delivery_date).getTime() : Date.now()
                    return `${Math.round((end - new Date(s.departure_date).getTime()) / 86400000)}д`
                  }

                  return (<>
                    {showMonthHeader && (
                      <tr key={`month-${curMonth}`}><td colSpan={9} className="px-5 py-2 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-[12px] font-semibold text-slate-500 capitalize">{curMonth}</span>
                      </td></tr>
                    )}
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/60 transition-colors"
                      onClick={() => openShipment(s.id)}>
                      <td className="px-5 py-2">
                        <p className="text-[14px] font-bold text-slate-900"><Hl text={s.container_number || '—'} q={search} /></p>
                        <p className="text-[11px] text-slate-400">
                          {s.container_size ? <span className={`inline-block rounded px-1.5 py-px mr-1 text-[10px] font-medium ${s.container_size === 20 ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>{s.container_size}ft</span> : ''}
                          {s.container_type ? <span className={`inline-block rounded px-1.5 py-px text-[10px] font-medium ${
                            s.container_type === 'Выкупной' ? 'bg-amber-100 text-amber-700' :
                            s.container_type === 'Возвратный' ? 'bg-emerald-100 text-emerald-700' :
                            s.container_type === 'Собственный' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-200/80 text-slate-600'
                          }`}>{s.container_type}</span> : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-[14px] font-medium text-slate-800 whitespace-nowrap">{fmtDate(s.departure_date)}</td>
                      <td className="px-3 py-2.5 text-[14px] font-medium text-slate-900 max-w-[140px] truncate"><Hl text={(s.client as unknown as { name: string })?.name || '—'} q={search} /></td>
                      <td className="px-3 py-2.5 text-[14px] text-slate-800 max-w-[120px] truncate"><Hl text={s.sender_name || '—'} q={search} /></td>
                      <td className="px-3 py-2.5 text-[14px] text-slate-800 max-w-[120px] truncate"><Hl text={(s.carrier as unknown as { name: string })?.name || '—'} q={search} /></td>
                      <td className="px-3 py-2.5 text-[14px] font-semibold text-slate-900">{calcDays()}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: statusBg, color: status.color }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'dot-pulse' : ''}`} style={{ background: status.color }} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-1">
                        <input type="date" value={s.arrival_date || ''} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { e.stopPropagation(); updateDate(s.id, 'arrival_date', e.target.value) }}
                          className="h-7 w-[110px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300" />
                      </td>
                      <td className="px-3 py-1">
                        <input type="date" value={s.delivery_date || ''} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { e.stopPropagation(); updateDate(s.id, 'delivery_date', e.target.value) }}
                          className="h-7 w-[110px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300" />
                      </td>
                    </tr>
                  </>)
                })
                })()}
              </>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}

