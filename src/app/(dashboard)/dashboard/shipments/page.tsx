'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Ship, MapPin, ArrowRight, X, Filter } from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment, type Carrier, type Client } from '@/types/database'

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const fetch = async () => {
      const [{ data: shipData }, { data: carrierData }, { data: clientData }] = await Promise.all([
        supabase
          .from('shipments')
          .select('*, recipient:recipients(name), client:clients(name), carrier:carriers(name), sender:senders(name)')
          .order('departure_date', { ascending: false, nullsFirst: false })
          .limit(200),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('clients').select('id, name').order('name').limit(50),
      ])
      setShipments((shipData as unknown as Shipment[]) || [])
      setCarriers(carrierData || [])
      setClients(clientData || [])
      setLoading(false)
    }
    fetch()
  }, [])

  // Client-side filtering
  const filtered = useMemo(() => {
    let results = shipments

    if (search) {
      const q = search.toLowerCase()
      results = results.filter(s =>
        (s.container_number || '').toLowerCase().includes(q) ||
        ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
        ((s.carrier as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
        ((s.sender as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
        ((s.recipient as unknown as { name: string })?.name || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      results = results.filter(s => getShipmentStatus(s).key === statusFilter)
    }

    if (carrierFilter) {
      results = results.filter(s => s.carrier_id === carrierFilter)
    }

    if (clientFilter) {
      results = results.filter(s => s.client_id === clientFilter)
    }

    if (dateFrom) {
      results = results.filter(s => s.departure_date && s.departure_date >= dateFrom)
    }
    if (dateTo) {
      results = results.filter(s => s.departure_date && s.departure_date <= dateTo)
    }

    return results
  }, [shipments, search, statusFilter, carrierFilter, clientFilter, dateFrom, dateTo])

  const activeFiltersCount = [carrierFilter, clientFilter, dateFrom, dateTo].filter(Boolean).length

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setCarrierFilter(''); setClientFilter(''); setDateFrom(''); setDateTo('')
  }

  const statusFilters = [
    { key: 'all', label: 'Все' },
    { key: 'loading', label: 'Загрузка' },
    { key: 'in_transit', label: 'В пути' },
    { key: 'arrived', label: 'Прибыл' },
    { key: 'customs', label: 'Таможня' },
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

      {/* Search + Filters toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Контейнер, клиент, перевозчик, отправитель..."
            className="w-full h-9 rounded-lg bg-white border border-slate-200/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-9 px-3 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
              : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 animate-fade-up grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Перевозчик</label>
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Все перевозчики</option>
              {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Клиент</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Все клиенты</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Дата от</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Дата до</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
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
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-[6px] rounded-md text-[12px] font-medium transition-all duration-150 ${
              statusFilter === f.key
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Ship className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[14px] text-slate-400 font-medium">Не найдено</p>
          <p className="text-[12px] text-slate-300 mt-1">Попробуйте другой фильтр</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => {
            const status = getShipmentStatus(s)
            const progress = getShipmentProgress(s)
            return (
              <div
                key={s.id}
                className="card-interactive bg-white rounded-xl border border-slate-100 p-4 cursor-pointer animate-fade-up group"
                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-mono font-bold text-slate-800 tracking-tight">{s.container_number || '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.container_size ? `${s.container_size}ft` : ''} {s.container_type || ''}
                    </p>
                  </div>
                  <span className="badge-soft" style={{ background: status.color + '12', color: status.color }}>
                    <span className={`dot ${status.key === 'in_transit' ? 'dot-pulse' : ''}`} style={{ background: status.color }} />
                    {status.label}
                  </span>
                </div>

                <div className="progress-track mb-4">
                  <div className="progress-fill" style={{ width: `${progress}%`, background: status.color }} />
                </div>

                <div className="space-y-2 mb-3">
                  <TimelineRow label="Отправка" date={s.departure_date} color="#6366f1" done={!!s.departure_date} />
                  <TimelineRow label="Прибытие" date={s.arrival_date} color="#818cf8" done={!!s.arrival_date} />
                  <TimelineRow label="Доставка" date={s.delivery_date} color="#22c55e" done={!!s.delivery_date} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
                    <span className="truncate">{s.origin || '?'} → {s.destination_city || s.destination_station || '?'}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineRow({ label, date, color, done }: { label: string; date: string | null; color: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: done ? color : '#e2e8f0' }} />
      <span className="text-slate-400 w-[64px]">{label}</span>
      <span className={`font-medium ${done ? 'text-slate-700' : 'text-slate-300'}`}>{date || '—'}</span>
    </div>
  )
}
