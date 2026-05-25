'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, Clock, Diamond, Award, Medal, Star, Circle, Plus, X, Save } from 'lucide-react'
import { useProfile } from '@/lib/useProfile'
import type { Client } from '@/types/database'

type ActivityTab = 'all' | 'active' | 'moderate' | 'inactive'

interface ClientWithActivity extends Pick<Client, 'id' | 'name' | 'phone' | 'is_russia'> {
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
  const [adding, setAdding] = useState(false)
  const [newClient, setNewClient] = useState<{ name: string; phone: string; is_russia: boolean }>({ name: '', phone: '', is_russia: false })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { hasRole } = useProfile()
  const canEdit = hasRole('admin', 'manager')

  const saveNewClient = async () => {
    const name = newClient.name.trim()
    if (!name) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, phone: newClient.phone.trim() || null, is_russia: newClient.is_russia })
      .select('id, name, phone, is_russia')
      .single()
    setSaving(false)
    if (error) {
      alert(`Не удалось добавить: ${error.message}`)
      return
    }
    if (data) {
      setClients(prev => [
        { ...data, lastShipmentDate: null, daysSince: null, shipmentCount: 0 },
        ...prev,
      ])
    }
    setNewClient({ name: '', phone: '', is_russia: false })
    setAdding(false)
  }

  const toggleSort = (field: 'name' | 'daysSince' | 'shipmentCount') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir(field === 'name' ? 'asc' : 'desc') }
  }

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      // Single RPC: server-side GROUP BY вместо загрузки всех shipments в браузер
      const { data, error } = await supabase.rpc('clients_with_stats')
      if (error || !data) { setLoading(false); return }

      const nowMs = Date.now()
      const enriched: ClientWithActivity[] = (data as any[]).map((c) => {
        const latest = c.last_shipment_date as string | null
        const daysSince = latest ? Math.floor((nowMs - new Date(latest).getTime()) / 86400000) : null
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          is_russia: c.is_russia,
          lastShipmentDate: latest,
          daysSince,
          shipmentCount: Number(c.shipment_count) || 0,
        }
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

  const tabs: { key: ActivityTab; label: string; count: number }[] = useMemo(() => {
    let active = 0, moderate = 0, inactive = 0
    for (const c of clients) {
      if (c.daysSince === null || c.daysSince > 365) inactive++
      else if (c.daysSince < 90) active++
      else if (c.daysSince <= 365) moderate++
    }
    return [
      { key: 'all', label: 'Все', count: clients.length },
      { key: 'active', label: 'Активные', count: active },
      { key: 'moderate', label: 'Умеренные', count: moderate },
      { key: 'inactive', label: 'Неактивные', count: inactive },
    ]
  }, [clients])

  function getRank(count: number): { label: string; emoji: string; color: string; bg: string } {
    if (count >= 100) return { label: 'Зверь', emoji: '🦁', color: 'text-red-600', bg: 'bg-red-50' }
    if (count >= 50) return { label: 'Бриллиант', emoji: '💎', color: 'text-violet-600', bg: 'bg-violet-50' }
    if (count >= 20) return { label: 'Золото', emoji: '🥇', color: 'text-amber-600', bg: 'bg-amber-50' }
    if (count >= 10) return { label: 'Серебро', emoji: '🥈', color: 'text-slate-500', bg: 'bg-slate-50' }
    if (count >= 3) return { label: 'Бронза', emoji: '🥉', color: 'text-orange-600', bg: 'bg-orange-50' }
    return { label: 'Новичок', emoji: '⚪', color: 'text-slate-400', bg: 'bg-slate-50' }
  }

  const rankStats = useMemo(() => {
    let beast = 0, diamond = 0, gold = 0, silver = 0, bronze = 0, newbie = 0
    for (const c of clients) {
      const n = c.shipmentCount
      if (n >= 100) beast++
      else if (n >= 50) diamond++
      else if (n >= 20) gold++
      else if (n >= 10) silver++
      else if (n >= 3) bronze++
      else newbie++
    }
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

      {/* Rank bar */}
      {!loading && clients.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200/60 px-4 py-3">
          <div className="flex items-center gap-6 overflow-x-auto">
            {rankStats.filter(r => r.count > 0).map(r => (
              <div key={r.label} className="flex items-center gap-2 shrink-0 group cursor-default" title={r.threshold}>
                <span className="text-sm">{r.emoji}</span>
                <span className={`text-[14px] font-bold ${r.color}`}>{r.count}</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">{r.label}</span>
              </div>
            ))}
            <div className="ml-auto text-[10px] text-slate-300 hidden md:block shrink-0">наведите для подсказки</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 border-b border-slate-200 flex-1 min-w-0 overflow-x-auto md:overflow-visible">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 pb-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all shrink-0 ${
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
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="Поиск по имени..."
            className="w-full h-9 rounded-lg bg-white border border-slate-200 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <button onClick={() => setAdding(true)} className="h-9 flex items-center gap-1.5 px-3 bg-slate-900 text-white rounded-lg text-[12px] font-medium hover:bg-slate-800 transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Новый</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => !saving && setAdding(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-[14px] font-semibold text-slate-900">Новый клиент</p>
              <button onClick={() => !saving && setAdding(false)} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Имя *</p>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveNewClient() }}
                  autoFocus
                  placeholder="Например, Сергей Москва"
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Телефон</p>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+7..."
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium mb-1">Регион</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewClient(p => ({ ...p, is_russia: false }))}
                    className={`h-10 rounded-lg border text-[13px] font-medium transition-colors ${!newClient.is_russia ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    🇰🇿 Казахстан
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClient(p => ({ ...p, is_russia: true }))}
                    className={`h-10 rounded-lg border text-[13px] font-medium transition-colors ${newClient.is_russia ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    🇷🇺 Россия
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-4 flex items-center gap-2">
              <button onClick={() => setAdding(false)} disabled={saving} className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50">Отмена</button>
              <button onClick={saveNewClient} disabled={saving || !newClient.name.trim()} className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

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
