'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, ClipboardCheck, Package, Ship, Flag, CircleCheck, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// The board has no data of its own: every card is a cargo request or a shipment,
// and its column is derived from that record. Moving a card = editing the record where it lives.
type Card = { id: string; href: string; title: string; line?: string; mono?: string; foot?: string; since: string | null; alert?: string; warn?: string; site?: boolean }
type Column = { key: string; title: string; icon: typeof Ship; cards: Card[]; total: number; more?: string; note?: string }

const LIMIT = 15
const SLOW_TRANSIT_DAYS = 50 // ponytail: fixed threshold (median Dubai → border is 36); per-route norms if it gets noisy
const DAY = 86400000

function ago(d: string | null, now: number) {
  if (!d) return ''
  const m = Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000))
  return m < 60 ? `${m} мин` : m < 1440 ? `${Math.floor(m / 60)} ч` : `${Math.floor(m / 1440)} д`
}
const days = (d: string | null, now: number) => (d ? Math.floor((now - new Date(d).getTime()) / DAY) : 0)

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[] | null>(null)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const supabase = createClient()
    const ship = () => supabase.from('shipments')
      .select('id, container_number, container_size, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, created_at, client:clients(name, is_russia)', { count: 'exact' })
    const twoWeeksAgo = new Date(now - 14 * DAY).toISOString().slice(0, 10)

    Promise.all([
      supabase.from('cargo_requests').select('id, request_number, client_name, origin, destination, container_size, status, created_at, shipment_id')
        .eq('is_demo', false).is('shipment_id', null).order('created_at', { ascending: false }).limit(200),
      ship().is('departure_date', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false).order('created_at', { ascending: false }).limit(LIMIT),
      ship().not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false).order('departure_date').limit(LIMIT),
      ship().not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false).order('arrival_date').limit(LIMIT),
      ship().gte('delivery_date', twoWeeksAgo).order('delivery_date', { ascending: false }).limit(LIMIT),
    ]).then(([requests, loading, transit, border, delivered]) => {
      const failed = [requests, loading, transit, border, delivered].find(r => r.error)
      if (failed) { setError('Не удалось загрузить воронку. Обновите страницу.'); return }

      const reqCard = (r: NonNullable<typeof requests.data>[number]): Card => ({
        id: r.id, href: '/dashboard/cargo-requests', title: r.client_name, line: `${r.origin || '—'} → ${r.destination || '—'} · ${r.container_size} ft`,
        foot: `№${String(r.request_number).padStart(4, '0')}`, since: r.created_at, site: r.status === 'submitted',
        warn: r.status === 'changes_requested' ? 'нужны исправления' : r.status === 'waiting' ? 'ждём данные' : undefined,
      })
      const shipCard = (stage: 'loading' | 'transit' | 'border' | 'delivered') => (s: NonNullable<typeof transit.data>[number]): Card => {
        const client = Array.isArray(s.client) ? s.client[0] : s.client
        const since = stage === 'loading' ? s.created_at : stage === 'transit' ? s.departure_date : stage === 'border' ? s.arrival_date : s.delivery_date
        const inTransit = days(s.departure_date, now)
        return {
          id: s.id, href: `/dashboard/shipments/${s.id}`, title: client?.name || 'Без клиента', mono: s.container_number || undefined,
          line: `${s.origin || '—'} → ${s.destination_city || s.destination_station || '—'}`, since,
          foot: stage === 'transit' ? `${inTransit} дн. в пути` : stage === 'border' ? (client?.is_russia ? 'Транзит КЗ' : 'На границе') : undefined,
          alert: stage === 'transit' && inTransit > SLOW_TRANSIT_DAYS ? `${inTransit} дн.` : undefined,
        }
      }

      const reqs = requests.data || []
      const pick = (...statuses: string[]) => reqs.filter(r => statuses.includes(r.status)).map(reqCard)
      const drafts = pick('submitted', 'draft', 'waiting', 'changes_requested'), accepted = pick('accepted')

      setColumns([
        { key: 'request', title: 'Заявка', icon: ClipboardList, cards: drafts, total: drafts.length, note: 'С сайта и от менеджера' },
        { key: 'accepted', title: 'Принята', icon: ClipboardCheck, cards: accepted, total: accepted.length, note: 'Согласовано, перевозка не создана' },
        { key: 'loading', title: 'Загрузка', icon: Package, cards: (loading.data || []).map(shipCard('loading')), total: loading.count || 0 },
        { key: 'transit', title: 'В пути', icon: Ship, cards: (transit.data || []).map(shipCard('transit')), total: transit.count || 0, more: '/dashboard/shipments?status=in_transit', note: 'Сначала самые долгие' },
        { key: 'border', title: 'Граница / транзит', icon: Flag, cards: (border.data || []).map(shipCard('border')), total: border.count || 0, more: '/dashboard/shipments?status=arrived', note: 'Сначала самые долгие' },
        { key: 'delivered', title: 'Доставлен', icon: CircleCheck, cards: (delivered.data || []).map(shipCard('delivered')), total: delivered.count || 0, more: '/dashboard/shipments?status=delivered', note: 'За последние 14 дней' },
      ])
    })
  }, [now])

  return (
    <div className="space-y-5 pb-6">
      <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Воронка</h1>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      {!columns && !error && <div role="status" aria-label="Загружаем воронку" className="grid gap-3 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}</div>}
      {columns && <>
        <Row label="Продажи" columns={columns.slice(0, 3)} now={now} className="md:grid-cols-3" />
        <Row label="Перевозка" columns={columns.slice(3)} now={now} className="md:grid-cols-3" />
      </>}
    </div>
  )
}

function Row({ label, columns, now, className }: { label: string; columns: Column[]; now: number; className: string }) {
  return (
    <section>
      <h2 className="mb-2 text-[12px] font-medium text-slate-400">{label}</h2>
      <div className={cn('grid items-start gap-3', className)}>
        {columns.map(col => (
          <div key={col.key} className="min-w-0 rounded-xl bg-slate-100/70 p-2.5">
            <div className="flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-semibold text-slate-800">
              <col.icon className="h-4 w-4 text-slate-400" />{col.title}
              <span className="ml-auto text-[12px] font-medium tabular-nums text-slate-400">{col.total}</span>
            </div>
            {col.note && <p className="px-1 pb-1 text-[11px] text-slate-400">{col.note}</p>}
            {col.cards.length === 0 && <p className="px-1 py-6 text-center text-[12px] text-slate-400">Пусто</p>}
            <ul className="space-y-1.5">
              {col.cards.map(card => (
                <li key={card.id}>
                  <Link href={card.href} className="block rounded-lg border border-slate-200/70 bg-white px-2.5 py-2 hover:border-slate-300">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{card.title}</p>
                    {card.mono && <p className="truncate font-mono text-[12px] text-slate-700">{card.mono}</p>}
                    {card.line && <p className="truncate text-[12px] text-slate-500">{card.line}</p>}
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      {card.site && <Globe className="h-3 w-3" aria-label="С сайта" />}
                      {card.alert && <span className="rounded bg-red-50 px-1.5 py-px font-medium text-red-600">{card.alert}</span>}
                      {card.warn && <span className="rounded bg-amber-50 px-1.5 py-px font-medium text-amber-700">{card.warn}</span>}
                      {card.foot && !card.alert && <span className="truncate">{card.foot}</span>}
                      <span className="ml-auto shrink-0 tabular-nums">{ago(card.since, now)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            {col.total > col.cards.length && (col.more
              ? <Link href={col.more} className="mt-2 block text-center text-[12px] text-slate-500 hover:text-slate-900">ещё {col.total - col.cards.length}</Link>
              : <p className="mt-2 text-center text-[12px] text-slate-400">ещё {col.total - col.cards.length}</p>)}
          </div>
        ))}
      </div>
    </section>
  )
}
