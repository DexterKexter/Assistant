'use client'

import { createElement, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Package, Anchor, Ship, Flag, Stamp, ArrowRight, Warehouse, Truck, Building2, MapPin, CalendarDays, Container, Flame, TriangleAlert, BellRing, Hourglass, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, fmtDate } from '@/lib/utils'
import { Place } from '@/components/place'
import { loadingDue, movePatch, STAGES, type Stage } from '@/lib/pipeline-stage'

// The board has no data of its own: every card is a cargo request or a shipment,
// and its column is derived from that record. Dragging a shipment card just edits its dates.
type Card = { id: string; stage?: Stage; href: string; title: string; from: string; to: string; size?: string; mono?: string; facts: Fact[]; chip?: Fact; due?: { date: string; days: number; text: string; tone: 'late' | 'soon' | 'ok' }; foot?: string; alert?: string; }
// icon, what it means (tooltip), value
type Fact = [typeof Ship, string, string | null | undefined]
type Column = { key: string; title: string; icon: typeof Ship; cards: Card[]; total: number; more?: string }

const LIMIT = 15
const SLOW_TRANSIT_DAYS = 50 // ponytail: fixed threshold (median Dubai → border is 36); per-route norms if it gets noisy
const DAY = 86400000
const BOARD = STAGES.filter((st): st is Exclude<Stage, 'delivered'> => st !== 'delivered')

// The later it is, the louder the icon.
const dueIcon = (d: number) => (d <= -3 ? Flame : d < 0 ? TriangleAlert : d === 0 ? BellRing : d <= 3 ? Hourglass : CircleCheck)
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
    const today = new Date(now).toLocaleDateString('sv-SE')
    const active = () => open().is('delivery_date', null).eq('is_completed', false)

    Promise.all([
      supabase.from('cargo_requests').select('id, client_name, origin, destination, container_size, loading_date, supplier')
        .eq('is_demo', false).is('shipment_id', null).order('loading_date', { nullsFirst: false }).order('created_at', { ascending: false }).limit(200), // most urgent loading first
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).is('export_date', null).order('created_at', { ascending: false }).limit(LIMIT),
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).not('export_date', 'is', null).order('export_date').limit(LIMIT),
      active().is('customs_date', null).is('arrival_date', null).not('departure_date', 'is', null).order('departure_date').limit(LIMIT),
      active().is('customs_date', null).not('arrival_date', 'is', null).order('arrival_date').limit(LIMIT),
      active().not('customs_date', 'is', null).order('customs_date').limit(LIMIT),
    ]).then(([requests, ...ships]) => {
      if (requests.error || ships.some(r => r.error)) { setError('Не удалось загрузить воронку. Обновите страницу.'); return }

      const reqs = (requests.data || []).map((r): Card => ({
        id: r.id, href: '/dashboard/cargo-requests', title: r.client_name,
        from: r.origin || '—', to: r.destination || '—', size: `${r.container_size} ft`, facts: [], chip: [Container, 'Поставщик контейнера', r.supplier], due: r.loading_date ? { date: fmtDate(r.loading_date), ...loadingDue(r.loading_date, today) } : undefined,
      }))
      const shipCard = (stage: Stage) => (s: NonNullable<(typeof ships)[number]['data']>[number]): Card => {
        const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v)
        const client = one(s.client), carrier = one(s.carrier)?.name, recipient = one(s.recipient)?.name
        const sender: Fact = [Warehouse, 'Отправитель', s.sender_name], truck: Fact = [Truck, 'Перевозчик', carrier]
        const atBorder = stage === 'border' || stage === 'customs'
        // Each stage shows what the manager needs at that moment.
        const facts: Record<Stage, Fact[]> = {
          loading: [sender, [Package, 'Груз', s.cargo_description]],
          export: [sender, truck],
          transit: [[MapPin, 'Погранпереход', s.destination_station && `через ${s.destination_station}`], truck],
          border: [[Building2, 'Получатель', recipient], truck],
          customs: [[Building2, 'Получатель', recipient], truck],
          delivered: [],
        }
        const inTransit = days(s.departure_date, now)
        return {
          id: s.id, stage, href: `/dashboard/shipments/${s.id}`, title: client?.name || 'Без клиента', mono: [s.container_number, s.container_type].filter(Boolean).join(' · ') || undefined,
          // At the border the card reads "where it stands → where it goes next".
          from: (atBorder ? s.destination_station : s.origin) || '—', to: s.destination_city || '—',
          size: s.container_size ? `${s.container_size} ft` : undefined, facts: facts[stage],
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
                      <Link href={card.href} draggable={false} className="block overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-5 text-slate-900">{card.title}</p>
                          {/* Same colours as the size badge on the cargo requests page. */}
                          {card.size && <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', card.size.startsWith('20') ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600')}>{card.size}</span>}
                        </div>
                        {card.mono && <p className="truncate font-mono text-[11.5px] text-slate-500">{card.mono}</p>}
                        <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
                          <span className="truncate"><Place name={card.from} /></span>
                          <ArrowRight className="size-3.5 shrink-0 text-slate-300" />
                          <span className="truncate"><Place name={card.to} /></span>
                        </p>
                        {card.chip?.[2] && (
                          <p title={card.chip[1]} className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {createElement(card.chip[0], { className: 'size-3 shrink-0 text-slate-400', 'aria-label': card.chip[1] })}<span className="truncate">{card.chip[2]}</span>
                          </p>
                        )}
                        {card.facts.some(f => f[2]) && (
                          <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[12px] text-slate-600">
                            {card.facts.filter(f => f[2]).map(([Icon, label, value]) => (
                              <li key={label} title={label} className="flex items-center gap-1.5">
                                <Icon className="size-3.5 shrink-0 text-slate-400" aria-label={label} /><span className="truncate">{value}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {(card.alert || card.foot) && (
                          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            {card.alert && <span className="whitespace-nowrap rounded bg-red-50 px-1.5 py-px font-medium text-red-600">{card.alert} в пути</span>}
                            {card.foot && !card.alert && <span className="truncate">{card.foot}</span>}
                          </p>
                        )}
                        {card.due && (
                          <div className={cn('-mx-3 -mb-3 mt-3 flex items-center gap-1.5 px-3 py-1.5 text-white', { late: 'bg-red-600', soon: 'bg-orange-500', ok: 'bg-emerald-600' }[card.due.tone])}>
                            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="text-[12px] font-bold tabular-nums">{card.due.date.slice(0, 5)}</span>
                            <span className="ml-auto inline-flex min-w-0 items-center gap-1 text-[12px] font-bold">
                              {createElement(dueIcon(card.due.days), { className: 'size-3.5 shrink-0', 'aria-hidden': true })}<span className="truncate first-letter:uppercase">{card.due.text}</span>
                            </span>
                          </div>
                        )}
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
