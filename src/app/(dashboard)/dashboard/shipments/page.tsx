'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, Ship, MapPin, Calendar } from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment } from '@/types/database'

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const fetch = async () => {
      let query = supabase
        .from('shipments')
        .select('*, recipient:recipients(name), client:clients(name), carrier:carriers(name)')
        .order('departure_date', { ascending: false, nullsFirst: false })
        .limit(100)

      if (search) query = query.ilike('container_number', `%${search}%`)

      const { data } = await query
      let results = (data as unknown as Shipment[]) || []

      if (statusFilter !== 'all') {
        results = results.filter(s => {
          const st = getShipmentStatus(s)
          return st.key === statusFilter
        })
      }

      setShipments(results)
      setLoading(false)
    }
    fetch()
  }, [search, statusFilter])

  const filters = [
    { key: 'all', label: 'Все' },
    { key: 'loading', label: 'Загрузка' },
    { key: 'in_transit', label: 'В пути' },
    { key: 'arrived', label: 'Прибыл' },
    { key: 'customs', label: 'Таможня' },
    { key: 'delivered', label: 'Доставлен' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Перевозки</h1>
        <p className="text-sm text-slate-500 mt-1">Отслеживание контейнеров и грузов</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по номеру контейнера..."
            className="w-full h-10 rounded-xl bg-white border border-slate-200 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipment cards grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка...</div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-20">
          <Ship className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Перевозки не найдены</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shipments.map((s, i) => {
            const status = getShipmentStatus(s)
            const progress = getShipmentProgress(s)
            return (
              <div
                key={s.id}
                className="shipment-card bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer animate-fade-up"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-mono font-bold text-slate-800">{s.container_number || '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.container_size ? `${s.container_size}ft` : ''} {s.container_type || ''}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: status.color + '15', color: status.color }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'status-dot-active' : ''}`} style={{ background: status.color }} />
                    {status.label}
                  </span>
                </div>

                {/* Progress */}
                <div className="progress-bar mb-4">
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, background: status.color }} />
                </div>

                {/* Timeline */}
                <div className="space-y-2 mb-4">
                  {s.departure_date && (
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span className="text-slate-400 w-20">Отправка</span>
                      <span className="text-slate-700 font-medium">{s.departure_date}</span>
                    </div>
                  )}
                  {s.arrival_date && (
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-slate-400 w-20">Прибытие</span>
                      <span className="text-slate-700 font-medium">{s.arrival_date}</span>
                    </div>
                  )}
                  {s.delivery_date ? (
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-400 w-20">Доставка</span>
                      <span className="text-slate-700 font-medium">{s.delivery_date}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="text-slate-400 w-20">Доставка</span>
                      <span className="text-slate-400">—</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{s.origin || '?'} → {s.destination_city || s.destination_station || '?'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[100px]">
                    {(s.carrier as unknown as { name: string })?.name || ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
