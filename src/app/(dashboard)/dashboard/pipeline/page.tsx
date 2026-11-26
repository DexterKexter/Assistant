'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Package, Anchor, Ship, Flag, Stamp, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, fmtDate } from '@/lib/utils'
import { movePatch, STAGES, type Stage } from '@/lib/pipeline-stage'

// The board has no data of its own: every card is a cargo request or a shipment,
// and its column is derived from that record. Dragging a shipment card just edits its dates.
type Card = { id: string; stage?: Stage; href: string; title: string; rows: [string, string | null | undefined][]; mono?: string; foot?: string; since: string | null; alert?: string; warn?: string; site?: boolean }
type Column = { key: string; title: string; icon: typeof Ship; cards: Card[]; total: number; more?: string }

const LIMIT = 15
const SLOW_TRANSIT_DAYS = 50 // ponytail: fixed threshold (median Dubai → border is 36); per-route norms if it gets noisy
const DAY = 86400000
const BOARD = STAGES.filter((st): st is Exclude<Stage, 'delivered'> => st !== 'delivered')

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
  const [tick, setTick] = useState(0)
  const [drag, setDrag] = useState<Card | null>(null)
  const [over, setOver] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const open = () => supabase.from('shipments')
      .select('id, container_number, container_size, container_type, cargo_description, sender_name, carrier:carriers(name), recipient:recipients(name), origin, destination_city, destination_station, export_date, departure_date, arrival_date, customs_date, delivery_date, created_at, client:clients(name, is_russia)', { count: 'exact' })
    const active = () => open().is('delivery_date', null).eq('is_completed', false)

    Promise.all([
      supabase.from('cargo_requests').select('id, request_number, client_name, origin, destination, container_size, loading_date, status, created_at')
        .eq('is_demo', false).is('shipment_id', null).order('created_at', { ascending: false }).limit(200),
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).is('export_date', null).order('created_at', { ascending: false }).limit(LIMIT),
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).not('export_date', 'is', null).order('export_date').limit(LIMIT),
      active().is('customs_date', null).is('arrival_date', null).not('departure_date', 'is', null).order('departure_date').limit(LIMIT),
      active().is('customs_date', null).not('arrival_date', 'is', null).order('arrival_date').limit(LIMIT),
      active().not('customs_date', 'is', null).order('customs_date').limit(LIMIT),
    ]).then(([requests, ...ships]) => {
      if (requests.error || ships.some(r => r.error)) { setError('Не удалось загрузить воронку. Обновите страницу.'); return }

      const reqs = (requests.data || []).map((r): Card => ({
        id: r.id, href: '/dashboard/cargo-requests', title: r.client_name,
        rows: [['Маршрут', `${r.origin || '—'} → ${r.destination || '—'}`], ['Контейнер', `${r.container_size} ft`], ['Загрузка', r.loading_date && fmtDate(r.loading_date)]],
        foot: `№${String(r.request_number).padStart(4, '0')}`, since: r.created_at, site: r.status === 'submitted',
        warn: r.status === 'changes_requested' ? 'нужны исправления' : r.status === 'waiting' ? 'ждём данные' : r.status === 'accepted' ? 'принята' : undefined,
      }))
      const shipCard = (stage: Stage) => (s: NonNullable<(typeof ships)[number]['data']>[number]): Card => {
        const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v)
        const client = one(s.client), carrier = one(s.carrier)?.name, recipient = one(s.recipient)?.name
        const route: [string, string] = ['Маршрут', `${s.origin || '—'} → ${s.destination_city || '—'}`]
        const box: [string, string] = ['Контейнер', [s.container_size && `${s.container_size} ft`, s.container_type].filter(Boolean).join(' · ')]
        // Each stage shows what the manager needs at that moment.
        const byStage: Record<Stage, Card['rows']> = {
          loading: [route, box, ['Отправитель', s.sender_name], ['Груз', s.cargo_description]],
          export: [route, box, ['Отправитель', s.sender_name], ['Перевозчик', carrier]],
          transit: [route, ['Перевозчик', carrier], ['Граница', s.destination_station]],
          border: [['Переход', s.destination_station], ['Едет в', s.destination_city], ['Получатель', recipient]],
          customs: [['Переход', s.destination_station], ['Едет в', s.destination_city], ['Получатель', recipient]],
          delivered: [route],
        }
        const rows = byStage[stage]
        const since = { loading: s.created_at, export: s.export_date, transit: s.departure_date, border: s.arrival_date, customs: s.customs_date, delivered: s.delivery_date }[stage]
        const inTransit = days(s.departure_date, now)
        return {
          id: s.id, stage, href: `/dashboard/shipments/${s.id}`, title: client?.name || 'Без клиента', mono: s.container_number || undefined,
          rows, since,
          foot: stage === 'transit' ? `${inTransit} дн. в пути` : stage === 'border' && client?.is_russia ? 'Транзит КЗ' : undefined,
          alert: stage === 'transit' && inTransit > SLOW_TRANSIT_DAYS ? `${inTransit} дн.` : undefined,
        }
      }
      const meta: Record<Exclude<Stage, 'delivered'>, Pick<Column, 'title' | 'icon' | 'more'>> = {
        loading: { title: 'Загрузка', icon: Package },
        export: { title: 'Экспорт', icon: Anchor },
        transit: { title: 'В пути', icon: Ship, more: '/dashboard/shipments?status=in_transit' },
        border: { title: 'Граница', icon: Flag, more: '/dashboard/shipments?status=arrived' },
        customs: { title: 'Таможня', icon: Stamp },
      }
      setError('')
      setColumns([
        { key: 'request', title: 'Заявка', icon: ClipboardList, cards: reqs, total: reqs.length },
        // Delivered shipments leave the board; they live in the shipments list.
        ...BOARD.map((st, i) => ({ key: st, ...meta[st], cards: (ships[i].data || []).map(shipCard(st)), total: ships[i].count || 0 })),
      ])
    })
  }, [now, tick])

  async function drop(to: string) {
    const card = drag
    setDrag(null); setOver('')
    if (!card?.stage || to === 'request' || to === card.stage) return
    const back = STAGES.indexOf(to as Stage) < STAGES.indexOf(card.stage)
    if (back && !confirm('Вернуть перевозку на этап назад? Даты следующих этапов будут очищены.')) return
    const { error } = await createClient().from('shipments').update(movePatch(card.stage, to as Stage, new Date().toLocaleDateString('sv-SE'))).eq('id', card.id)
    if (error) setError('Не удалось переместить. Попробуйте ещё раз.')
    else setTick(t => t + 1)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Воронка</h1>
        <p className="text-[12px] text-slate-400">Перетащите карточку в колонку — этап сменится, дата проставится сегодняшняя</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      {!columns && !error && <div role="status" aria-label="Загружаем воронку" className="skeleton h-64 rounded-xl" />}
      {columns && (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1400px] grid-cols-6 items-start gap-2.5">
            {columns.map(col => (
              // ponytail: mouse drag only; keyboard users change the dates on the shipment page
              <div key={col.key} onDragOver={e => { if (drag && col.key !== 'request') { e.preventDefault(); setOver(col.key) } }} onDrop={() => drop(col.key)}
                className={cn('min-w-0 rounded-xl bg-slate-100/70 p-2', over === col.key && drag?.stage !== col.key && 'ring-2 ring-indigo-400')}>
                <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[13px] font-semibold text-slate-800">
                  <col.icon className="h-4 w-4 text-slate-400" />{col.title}
                  <span className="ml-auto text-[12px] font-medium tabular-nums text-slate-400">{col.total}</span>
                </div>
                {col.cards.length === 0 && <p className="px-1 py-6 text-center text-[12px] text-slate-400">Пусто</p>}
                <ul className="space-y-1.5">
                  {col.cards.map(card => (
                    <li key={card.id} draggable={!!card.stage} onDragStart={() => setDrag(card)} onDragEnd={() => { setDrag(null); setOver('') }}
                      className={cn(card.stage && 'cursor-grab active:cursor-grabbing', drag?.id === card.id && 'opacity-40')}>
                      <Link href={card.href} draggable={false} className="block rounded-lg border border-slate-200/70 bg-white px-2.5 py-2 hover:border-slate-300">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{card.title}</p>
                        {card.mono && <p className="truncate font-mono text-[12px] text-slate-700">{card.mono}</p>}
                        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[12px]">
                          {card.rows.filter(r => r[1]).map(([label, value]) => (
                            <div key={label} className="contents"><dt className="text-slate-400">{label}</dt><dd className="truncate text-slate-700" title={value || ''}>{value}</dd></div>
                          ))}
                        </dl>
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
        </div>
      )}
    </div>
  )
}
