'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Truck, Clock, DollarSign } from 'lucide-react'
import type { Carrier } from '@/types/database'

type ActivityTab = 'all' | 'active' | 'moderate' | 'inactive'

interface CarrierWithStats extends Pick<Carrier, 'id' | 'name'> {
  shipmentCount: number
  avgDeliveryCost: number | null
  lastShipmentDate: string | null
  daysSince: number | null
}

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<CarrierWithStats[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ActivityTab>('all')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: carriersData } = await supabase.from('carriers').select('id, name').order('name')
      const { data: shipmentsData } = await supabase.from('shipments').select('carrier_id, departure_date, delivery_cost')

      if (!carriersData) { setLoading(false); return }

      const now = new Date()
      const enriched: CarrierWithStats[] = carriersData.map(c => {
        const sh = (shipmentsData || []).filter(s => s.carrier_id === c.id)
        const withDates = sh.filter(s => s.departure_date).sort((a, b) => b.departure_date!.localeCompare(a.departure_date!))
        const latest = withDates[0]?.departure_date || null
        const daysSince = latest ? Math.floor((now.getTime() - new Date(latest).getTime()) / 86400000) : null
        const costs = sh.filter(s => s.delivery_cost).map(s => s.delivery_cost!)
        const avgCost = costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null
        return { ...c, shipmentCount: sh.length, avgDeliveryCost: avgCost, lastShipmentDate: latest, daysSince }
      })

      // Sort by shipment count desc
      enriched.sort((a, b) => b.shipmentCount - a.shipmentCount)
      setCarriers(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = carriers
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (tab === 'active') result = result.filter(c => c.daysSince !== null && c.daysSince < 90)
    if (tab === 'moderate') result = result.filter(c => c.daysSince !== null && c.daysSince >= 90 && c.daysSince <= 365)
    if (tab === 'inactive') result = result.filter(c => c.daysSince === null || c.daysSince > 365)
    return result
  }, [carriers, search, tab])

  const tabs: { key: ActivityTab; label: string; count: number }[] = useMemo(() => [
    { key: 'all', label: 'Все', count: carriers.length },
    { key: 'active', label: 'Активные', count: carriers.filter(c => c.daysSince !== null && c.daysSince < 90).length },
    { key: 'moderate', label: 'Умеренные', count: carriers.filter(c => c.daysSince !== null && c.daysSince >= 90 && c.daysSince <= 365).length },
    { key: 'inactive', label: 'Неактивные', count: carriers.filter(c => c.daysSince === null || c.daysSince > 365).length },
  ], [carriers])

  function getDaysLabel(days: number | null): { text: string; color: string } {
    if (days === null) return { text: 'нет загрузок', color: 'text-slate-300' }
    if (days === 0) return { text: 'сегодня', color: 'text-emerald-500' }
    if (days <= 30) return { text: `${days} д назад`, color: 'text-emerald-500' }
    if (days <= 90) return { text: `${days} д назад`, color: 'text-indigo-500' }
    if (days <= 365) return { text: `${days} д назад`, color: 'text-amber-500' }
    return { text: `${days} д назад`, color: 'text-red-400' }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Перевозчики</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">{carriers.length} перевозчиков</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 border-b border-slate-200 flex-1 min-w-0 overflow-x-auto md:overflow-visible">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 pb-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all shrink-0 ${tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg bg-white border border-slate-200 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><Truck className="w-10 h-10 text-slate-200 mx-auto mb-2" strokeWidth={1.5} /><p className="text-[13px] text-slate-400">Перевозчики не найдены</p></div>
      ) : (
        <>
        <div className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/60">
                {['Перевозчик', 'Перевозок', 'Средн. стоимость', 'Последняя загрузка'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const daysInfo = getDaysLabel(c.daysSince)
                return (
                  <tr key={c.id} onClick={() => router.push(`/dashboard/carriers/${c.id}`)} className="border-b border-slate-100 hover:bg-white/60 cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          <Truck className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <span className="text-[13px] font-medium text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="text-[12px] font-semibold text-slate-700">{c.shipmentCount}</span></td>
                    <td className="px-5 py-3">
                      {c.avgDeliveryCost ? (
                        <span className="text-[12px] font-semibold text-slate-700">${c.avgDeliveryCost.toLocaleString()}</span>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-300" strokeWidth={1.8} />
                        <span className={`text-[11px] font-medium ${daysInfo.color}`}>{daysInfo.text}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2">
          {filtered.map(c => {
            const daysInfo = getDaysLabel(c.daysSince)
            return (
              <div key={c.id} onClick={() => router.push(`/dashboard/carriers/${c.id}`)} className="bg-slate-50 rounded-xl border border-slate-200/60 p-3.5 cursor-pointer active:scale-[0.99] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shrink-0"><Truck className="w-4 h-4" strokeWidth={2} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${daysInfo.color}`}>{daysInfo.text}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{c.shipmentCount} перевозок</span>
                      {c.avgDeliveryCost && <><span className="text-[10px] text-slate-300">·</span><span className="text-[10px] text-slate-400">${c.avgDeliveryCost.toLocaleString()}</span></>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
