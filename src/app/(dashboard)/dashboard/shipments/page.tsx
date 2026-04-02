'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Ship, ArrowRight, X, Filter, Package, FileText, Wallet, User, Building2, Truck } from 'lucide-react'
import { getShipmentStatus, type Shipment, type Carrier, type Client } from '@/types/database'
import { fmtDate } from '@/lib/utils'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const router = useRouter()
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
                      onClick={() => setSelectedId(s.id)}>
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

      {/* Shipment detail modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-[#f8fafc] rounded-2xl w-[95vw] max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 overflow-auto px-5 py-4">
              <ShipmentDetailInline id={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShipmentDetailInline({ id, onClose }: { id: string; onClose: () => void }) {
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [tab, setTab] = useState<'shipment' | 'documents' | 'finance'>('shipment')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('shipments')
      .select('*, recipient:recipients(name), client:clients(name, is_russia), sender:senders(name), carrier:carriers(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => setShipment(data as unknown as Shipment))
  }, [id])

  if (!shipment) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const client = shipment.client as unknown as { name: string; is_russia: boolean } | null
  const isRussia = client?.is_russia || false
  const status = getShipmentStatus(shipment, isRussia)
  const recipient = shipment.recipient as unknown as { name: string } | null
  const carrier = shipment.carrier as unknown as { name: string } | null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <h1 className="text-[18px] font-bold text-slate-900 font-mono">{shipment.container_number}</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: status.color + '15', color: status.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>
        {shipment.contract_pdf && (
          <a href={shipment.contract_pdf} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[12px] font-medium hover:bg-slate-700 transition-colors">PDF</a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {([
          { key: 'shipment' as const, label: 'Перевозка', Icon: Package },
          { key: 'documents' as const, label: 'Документы', Icon: FileText },
          { key: 'finance' as const, label: 'Финансы', Icon: Wallet },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 pb-2 text-[13px] font-medium border-b-2 -mb-px transition-all ${tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <t.Icon className="w-3.5 h-3.5" strokeWidth={tab === t.key ? 2.2 : 1.6} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'shipment' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2"><Package className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Контейнер</p></div>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              <div className="flex items-center gap-2"><Ship className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Номер</span><p className="font-bold font-mono text-slate-900">{shipment.container_number}</p></div></div>
              <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Размер</span><p className="font-semibold text-slate-900">{shipment.container_size ? `${shipment.container_size}ft` : '—'}</p></div></div>
              <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Тип</span><p className="font-semibold text-slate-900">{shipment.container_type || '—'}</p></div></div>
              <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Груз</span><p className="font-semibold text-slate-900">{shipment.cargo_description || '—'}</p></div></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2"><Ship className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Участники</p></div>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Клиент</span><p className="font-semibold text-slate-900">{client?.name || '—'} {client?.is_russia ? '🇷🇺' : ''}</p></div></div>
              <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Получатель</span><p className="font-semibold text-slate-900">{recipient?.name || '—'}</p></div></div>
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Отправитель</span><p className="font-semibold text-slate-900">{shipment.sender_name || '—'}</p></div></div>
              <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.5} /><div><span className="text-slate-400 text-[12px]">Перевозчик</span><p className="font-semibold text-slate-900">{carrier?.name || '—'}</p></div></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'shipment' && (
        <div className="bg-white rounded-xl border border-slate-100 px-6 py-4">
          <div className="flex items-start">
            <div className="flex-1 text-center">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center mx-auto"><Ship className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.origin || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.departure_date)}</p>
            </div>
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${shipment.arrival_date ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {shipment.departure_date && <div className="mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-700">{(() => { if (!shipment.departure_date) return ''; const end = shipment.arrival_date ? new Date(shipment.arrival_date).getTime() : Date.now(); return Math.round((end - new Date(shipment.departure_date).getTime()) / 86400000) + 'д' })()}</div>}
            </div>
            <div className="flex-1 text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${shipment.arrival_date ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Filter className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.destination_station || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.arrival_date)}</p>
            </div>
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${shipment.delivery_date ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {shipment.arrival_date && <div className="mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-700">{(() => { const end = shipment.delivery_date ? new Date(shipment.delivery_date).getTime() : Date.now(); return Math.round((end - new Date(shipment.arrival_date!).getTime()) / 86400000) + 'д' })()}</div>}
            </div>
            <div className="flex-1 text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${shipment.delivery_date || shipment.is_completed ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-400'}`}><Ship className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.destination_city || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.delivery_date)}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="grid grid-cols-3 gap-3">
            {shipment.delivery_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Доставка</p><p className="text-[18px] font-bold text-slate-900">${shipment.delivery_cost.toLocaleString()}</p></div>}
            {shipment.price && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Цена</p><p className="text-[18px] font-bold text-slate-900">${shipment.price.toLocaleString()}</p></div>}
            {shipment.invoice_amount && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Счёт</p><p className="text-[18px] font-bold text-slate-900">${shipment.invoice_amount.toLocaleString()}</p></div>}
            {shipment.customs_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Таможня</p><p className="text-[18px] font-bold text-slate-900">${shipment.customs_cost.toLocaleString()}</p></div>}
            {shipment.additional_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Доп. расходы</p><p className="text-[18px] font-bold text-slate-900">${shipment.additional_cost.toLocaleString()}</p></div>}
          </div>
          {!shipment.delivery_cost && !shipment.price && !shipment.invoice_amount && <p className="text-[13px] text-slate-400 py-8 text-center">Нет данных</p>}
        </div>
      )}

      {tab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          {shipment.contract_pdf && <a href={shipment.contract_pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2"><div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center"><Ship className="w-3.5 h-3.5 text-slate-500" /></div><div><p className="text-[13px] font-medium text-slate-800">Договор</p><p className="text-[11px] text-slate-400">PDF</p></div></a>}
          {shipment.excel_files?.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2"><div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center"><Ship className="w-3.5 h-3.5 text-slate-500" /></div><div><p className="text-[13px] font-medium text-slate-800">Упаковочный лист {i+1}</p><p className="text-[11px] text-slate-400">Excel</p></div></a>)}
          {shipment.photos?.length ? <div className="flex gap-2 mt-3">{shipment.photos.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-20 h-20 rounded-lg overflow-hidden bg-slate-50"><img src={url} alt="" className="w-full h-full object-cover" /></a>)}</div> : null}
          {!shipment.contract_pdf && !shipment.excel_files?.length && !shipment.photos?.length && <p className="text-[13px] text-slate-400 py-8 text-center">Нет документов</p>}
        </div>
      )}
    </div>
  )
}
