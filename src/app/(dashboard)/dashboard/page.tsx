'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ship, Users, TrendingUp, Package, ArrowRight, MapPin } from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment } from '@/types/database'

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, inTransit: 0, completed: 0, clients: 0 })
  const [recent, setRecent] = useState<Shipment[]>([])
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const fetchData = async () => {
      const [
        { count: total },
        { count: inTransit },
        { count: completed },
        { count: clients },
        { data: recentData },
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).is('delivery_date', null).not('departure_date', 'is', null),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('is_completed', true),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('shipments').select('*, recipient:recipients(name), client:clients(name), carrier:carriers(name)').order('created_at', { ascending: false }).limit(8),
      ])
      setStats({ total: total || 0, inTransit: inTransit || 0, completed: completed || 0, clients: clients || 0 })
      setRecent((recentData as unknown as Shipment[]) || [])
    }
    fetchData()
  }, [])

  const cards = [
    { label: 'Всего перевозок', value: stats.total, icon: Ship, color: 'bg-blue-600', shadow: 'shadow-blue-600/20' },
    { label: 'В пути', value: stats.inTransit, icon: Package, color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
    { label: 'Доставлено', value: stats.completed, icon: TrendingUp, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Клиенты', value: stats.clients, icon: Users, color: 'bg-violet-500', shadow: 'shadow-violet-500/20' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Обзор</h1>
        <p className="text-sm text-slate-500 mt-1">Статистика и последние перевозки</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="animate-fade-up bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-all"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{card.value.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent shipments */}
      <div className="bg-white rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Последние перевозки</h2>
          <button
            onClick={() => router.push('/dashboard/shipments')}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Все перевозки <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Нет перевозок</div>
          ) : (
            recent.map((s, i) => {
              const status = getShipmentStatus(s)
              const progress = getShipmentProgress(s)
              return (
                <div
                  key={s.id}
                  className="shipment-card flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50/50 animate-fade-up"
                  style={{ animationDelay: `${(i + 4) * 60}ms` }}
                  onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                >
                  {/* Container number */}
                  <div className="w-32">
                    <p className="text-sm font-mono font-semibold text-slate-800">{s.container_number || '—'}</p>
                    <p className="text-[11px] text-slate-400">{s.container_size ? `${s.container_size}ft` : ''} {s.container_type || ''}</p>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-600 truncate">
                      {s.origin || '?'} → {s.destination_city || s.destination_station || '?'}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="w-40 hidden lg:block">
                    <p className="text-sm text-slate-600 truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                  </div>

                  {/* Progress */}
                  <div className="w-24">
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%`, background: status.color }} />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-28 flex justify-end">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: status.color + '18', color: status.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
