'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, Clock, Diamond, Award, Medal, Star, Circle } from 'lucide-react'
import type { Client } from '@/types/database'

type ActivityTab = 'all' | 'active' | 'moderate' | 'inactive'

interface ClientWithActivity extends Client {
  lastShipmentDate: string | null
  daysSince: number | null
  shipmentCount: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithActivity[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ActivityTab>('all')
  const [sortBy, setSortBy] = useState<'name' | 'daysSince' | 'shipmentCount'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()

  const toggleSort = (field: 'name' | 'daysSince' | 'shipmentCount') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir(field === 'name' ? 'asc' : 'desc') }
  }

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      // Fetch clients and their latest shipment dates
      const { data: clientsData } = await supabase.from('clients').select('*').order('name')
      const { data: shipmentsData } = await supabase.from('shipments').select('client_id, departure_date').order('departure_date', { ascending: false })

      if (!clientsData) { setLoading(false); return }

      const now = new Date()
      const enriched: ClientWithActivity[] = clientsData.map(c => {
        const clientShipments = (shipmentsData || []).filter(s => s.client_id === c.id && s.departure_date)
        const latest = clientShipments[0]?.departure_date || null
        const daysSince = latest ? Math.floor((now.getTime() - new Date(latest).getTime()) / 86400000) : null
        return { ...c, lastShipmentDate: latest, daysSince, shipmentCount: clientShipments.length }
      })

      setClients(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = clients

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q))
    }

    // Tab filter
    // Active: last shipment < 90 days ago
    // Moderate: 90-365 days
    // Inactive: > 365 days or no shipments
    if (tab === 'active') result = result.filter(c => c.daysSince !== null && c.daysSince < 90)
    if (tab === 'moderate') result = result.filter(c => c.daysSince !== null && c.daysSince >= 90 && c.daysSince <= 365)
    if (tab === 'inactive') result = result.filter(c => c.daysSince === null || c.daysSince > 365)

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'shipmentCount') cmp = a.shipmentCount - b.shipmentCount
      else if (sortBy === 'daysSince') cmp = (a.daysSince ?? 99999) - (b.daysSince ?? 99999)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [clients, search, tab, sortBy, sortDir])

  const tabs: { key: ActivityTab; label: string; count: number }[] = useMemo(() => [
    { key: 'all', label: 'Все', count: clients.length },
    { key: 'active', label: 'Активные', count: clients.filter(c => c.daysSince !== null && c.daysSince < 90).length },
    { key: 'moderate', label: 'Умеренные', count: clients.filter(c => c.daysSince !== null && c.daysSince >= 90 && c.daysSince <= 365).length },
    { key: 'inactive', label: 'Неактивные', count: clients.filter(c => c.daysSince === null || c.daysSince > 365).length },
  ], [clients])

  function getRank(count: number): { label: string; emoji: string; color: string; bg: string } {
    if (count >= 100) return { label: 'Зверь', emoji: '🦁', color: 'text-red-600', bg: 'bg-red-50' }
    if (count >= 50) return { label: 'Бриллиант', emoji: '💎', color: 'text-violet-600', bg: 'bg-violet-50' }
    if (count >= 20) return { label: 'Золото', emoji: '🥇', color: 'text-amber-600', bg: 'bg-amber-50' }
    if (count >= 10) return { label: 'Серебро', emoji: '🥈', color: 'text-slate-500', bg: 'bg-slate-50' }
    if (count >= 3) return { label: 'Бронза', emoji: '🥉', color: 'text-orange-600', bg: 'bg-orange-50' }
    return { label: 'Новичок', emoji: '⚪', color: 'text-slate-400', bg: 'bg-slate-50' }
  }

  const rankStats = useMemo(() => {
    const beast = clients.filter(c => c.shipmentCount >= 100).length
    const diamond = clients.filter(c => c.shipmentCount >= 50 && c.shipmentCount < 100).length
    const gold = clients.filter(c => c.shipmentCount >= 20 && c.shipmentCount < 50).length
    const silver = clients.filter(c => c.shipmentCount >= 10 && c.shipmentCount < 20).length
    const bronze = clients.filter(c => c.shipmentCount >= 3 && c.shipmentCount < 10).length
    const newbie = clients.filter(c => c.shipmentCount < 3).length
    return [
      { label: 'Зверь', emoji: '🦁', count: beast, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', threshold: 'от 100 перевозок' },
      { label: 'Бриллиант', emoji: '💎', count: diamond, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', threshold: 'от 50 перевозок' },
      { label: 'Золото', emoji: '🥇', count: gold, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', threshold: 'от 20 перевозок' },
      { label: 'Серебро', emoji: '🥈', count: silver, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200', threshold: 'от 10 перевозок' },
      { label: 'Бронза', emoji: '🥉', count: bronze, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', threshold: 'от 3 перевозок' },
      { label: 'Новичок', emoji: '⚪', count: newbie, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', threshold: '0-2 перевозки' },
    ]
  }, [clients])

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
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Клиенты</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">{clients.length} контактов</p>
      </div>

      {/* Stats + Ranks */}
      {!loading && clients.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rankStats.map(r => (
            <div key={r.label} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${r.border} ${r.bg} min-w-fit`}>
              <span className="text-lg">{r.emoji}</span>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[16px] font-bold ${r.color}`}>{r.count}</span>
                  <span className={`text-[11px] font-medium ${r.color} opacity-70`}>{r.label}</span>
                </div>
                <p className="text-[9px] text-slate-400">{r.threshold}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 border-b border-slate-200 flex-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 pb-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all ${
                tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="Поиск по имени..."
            className="w-full h-9 rounded-lg bg-white border border-slate-200 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[13px] text-slate-400">Клиенты не найдены</p>
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/60">
                {[
                  { field: 'name' as const, label: 'Клиент' },
                  { field: 'daysSince' as const, label: 'Последняя загрузка' },
                  { field: 'shipmentCount' as const, label: 'Перевозок' },
                ].map(col => (
                  <th key={col.field} onClick={() => toggleSort(col.field)}
                    className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600 select-none transition-colors">
                    {col.label} {sortBy === col.field && <span className="text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Телефон</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Регион</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const daysInfo = getDaysLabel(c.daysSince)
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-white/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium text-slate-800">{c.name}</span>
                        {c.shipmentCount >= 3 && <span className="text-[10px] ml-1">{getRank(c.shipmentCount).emoji}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-300" strokeWidth={1.8} />
                        <span className={`text-[11px] font-medium ${daysInfo.color}`}>{daysInfo.text}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-semibold text-slate-700">{c.shipmentCount}</span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-slate-500">{c.phone || '—'}</td>
                    <td className="px-5 py-3">
                      {c.is_russia ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">РФ</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600">КЗ</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map((c) => {
            const daysInfo = getDaysLabel(c.daysSince)
            return (
              <div
                key={c.id}
                className="bg-slate-50 rounded-xl border border-slate-200/60 p-3.5 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/dashboard/clients/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{c.name} {c.shipmentCount >= 3 && <span className="text-[10px]">{getRank(c.shipmentCount).emoji}</span>}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${daysInfo.color}`}>{daysInfo.text}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{c.shipmentCount} перевозок</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold shrink-0 ${c.is_russia ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {c.is_russia ? 'РФ' : 'КЗ'}
                  </span>
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
