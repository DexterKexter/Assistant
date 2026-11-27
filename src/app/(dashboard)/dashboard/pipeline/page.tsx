'use client'

import { createElement, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Package, Anchor, Ship, Flag, Stamp, ArrowRight, Warehouse, Truck, Building2, MapPin, CalendarDays, Clock, Container, Flame, TriangleAlert, BellRing, Hourglass, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, fmtDate } from '@/lib/utils'
import { Place } from '@/components/place'
import { CargoRequestDialog } from '@/components/cargo-request-dialog'
import { useShipmentModal } from '@/lib/shipment-modal'
import type { CargoRequest } from '@/lib/cargo-requests'
import { loadingDue, loadingProgress, movePatch, STAGES, type Stage } from '@/lib/pipeline-stage'

// The board has no data of its own: every card is a cargo request or a shipment,
// and its column is derived from that record. Dragging a shipment card just edits its dates.
type Card = { id: string; stage?: Stage; href: string; title: string; from: string; to: string; size?: string; mono?: string; kind?: string; line?: string; chip?: Fact; due?: { date: string; days: number; text: string; tone: 'late' | 'soon' | 'ok' | 'plain' } }
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
  const [request, setRequest] = useState<CargoRequest | null>(null)
  const { openShipment, selectedId } = useShipmentModal()

  // Cards open in a modal instead of leaving the board.
  async function openCard(e: React.MouseEvent, card: Card) {
    if (e.metaKey || e.ctrlKey) return // new tab still works
    e.preventDefault()
    if (card.stage) return openShipment(card.id)
    const { data } = await createClient().from('cargo_requests').select('*, cargo_request_items(*), cargo_request_replies(*)').eq('id', card.id).single()
    if (data) setRequest(data as CargoRequest)
    else setError('Не удалось открыть заявку.')
  }

  useEffect(() => {
    const supabase = createClient()
    const open = () => supabase.from('shipments')
      .select('id, container_number, container_size, container_type, sender_name, carrier:carriers(name), recipient:recipients(name), origin, destination_city, destination_station, loading_date, export_date, departure_date, arrival_date, customs_date, delivery_date, created_at, client:clients(name, is_russia)', { count: 'exact' })
    const today = new Date(now).toLocaleDateString('sv-SE')
    const active = () => open().is('delivery_date', null).eq('is_completed', false)

    Promise.all([
      supabase.from('cargo_requests').select('id, client_name, origin, destination, container_size, loading_date, supplier, cargo_request_items(name, position)')
        .eq('is_demo', false).is('shipment_id', null).order('loading_date', { nullsFirst: false }).order('created_at', { ascending: false }).limit(200), // most urgent loading first
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).is('export_date', null).order('loading_date', { nullsFirst: false }).order('created_at').limit(LIMIT), // longest in loading first
      active().is('customs_date', null).is('arrival_date', null).is('departure_date', null).not('export_date', 'is', null).order('export_date').limit(LIMIT),
      active().is('customs_date', null).is('arrival_date', null).not('departure_date', 'is', null).order('departure_date').limit(LIMIT),
      active().is('customs_date', null).not('arrival_date', 'is', null).order('arrival_date').limit(LIMIT),
      active().not('customs_date', 'is', null).order('customs_date').limit(LIMIT),
    ]).then(([requests, ...ships]) => {
      if (requests.error || ships.some(r => r.error)) { setError('Не удалось загрузить воронку. Обновите страницу.'); return }

      const reqs = (requests.data || []).map((r): Card => {
        const goods = [...(r.cargo_request_items || [])].sort((a, b) => a.position - b.position).map(i => i.name)
        return {
        id: r.id, href: '/dashboard/cargo-requests', title: r.client_name,
        from: r.origin || '—', to: r.destination || '—', size: `${r.container_size} ft`, line: goods.length > 1 ? `${goods[0]} +${goods.length - 1}` : goods[0], chip: [Container, 'Поставщик контейнера', r.supplier], due: r.loading_date ? { date: fmtDate(r.loading_date), ...loadingDue(r.loading_date, today) } : undefined,
      } })
      const shipCard = (stage: Stage) => (s: NonNullable<(typeof ships)[number]['data']>[number]): Card => {
        const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v)
        const client = one(s.client), carrier = one(s.carrier)?.name, recipient = one(s.recipient)?.name
        const atBorder = stage === 'border' || stage === 'customs'
        // One chip per stage: who the manager deals with at that moment.
        const chip: Record<Stage, Fact> = {
          loading: [Warehouse, 'Отправитель', s.sender_name],
          export: [Truck, 'Перевозчик', carrier],
          transit: [MapPin, 'Погранпереход', s.destination_station && `через ${s.destination_station}`],
          border: [Building2, 'Получатель', recipient],
          customs: [Building2, 'Получатель', recipient],
          delivered: [Building2, 'Получатель', recipient],
        }
        // Bottom strip: when the stage began and how long it has lasted. Only loading and transit have a norm to colour by.
        const since = { loading: s.loading_date || s.created_at.slice(0, 10), export: s.export_date, transit: s.departure_date, border: s.arrival_date, customs: s.customs_date, delivered: s.delivery_date }[stage]
        const spent = days(since, now)
        const due: Card['due'] = !since ? undefined
          : stage === 'loading' ? { date: fmtDate(since), ...loadingProgress(since, today) }
          : { date: fmtDate(since), days: SLOW_TRANSIT_DAYS - spent, text: `${spent} дн.`, tone: stage !== 'transit' ? 'plain' : spent > SLOW_TRANSIT_DAYS ? 'late' : 'ok' }
        return {
          id: s.id, stage, href: `/dashboard/shipments/${s.id}`, title: client?.name || 'Без клиента', mono: s.container_number || undefined, kind: s.container_type || undefined,
          // At the border the card reads "where it stands → where it goes next".
          from: (atBorder ? s.destination_station : s.origin) || '—', to: s.destination_city || '—',
          size: s.container_size ? `${s.container_size} ft` : undefined, chip: chip[stage], due,
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
  }, [now, tick, selectedId]) // selectedId: dates may have been edited in the shipment modal, reload when it closes

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
          <div className="grid min-w-[1620px] grid-cols-6 items-start gap-2.5">
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
                      <Link href={card.href} draggable={false} onClick={e => openCard(e, card)} className="block overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-md">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-5 text-slate-900">{card.title}</p>
                          {/* Same colours as the size badge on the cargo requests page. */}
                          {card.size && <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', card.size.startsWith('20') ? 'bg-blue-50 text-blue-600' : card.size.startsWith('45') ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-600')}>{card.size}</span>}
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
                          <span className="truncate"><Place name={card.from} /></span>
                          <ArrowRight className="size-3.5 shrink-0 text-slate-300" />
                          <span className="truncate"><Place name={card.to} /></span>
                        </p>
                        {card.mono && <p className="mt-2 truncate text-[12px] leading-[18px] text-slate-500"><span className="font-mono text-[13px] font-medium text-slate-800">{card.mono}</span>{card.kind && ` · ${card.kind}`}</p>}
                        {card.line && <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-[18px] text-slate-600"><Package className="size-3.5 shrink-0 text-slate-400" aria-label="Товар" /><span className="truncate">{card.line}</span></p>}
                        {card.chip?.[2] && (
                          <p title={card.chip[1]} className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {createElement(card.chip[0], { className: 'size-3 shrink-0 text-slate-400', 'aria-label': card.chip[1] })}<span className="truncate">{card.chip[2]}</span>
                          </p>
                        )}
                        {card.due && (
                          <div className={cn('-mx-3 -mb-3 mt-3 flex items-center gap-1.5 px-3 py-1.5 text-white', { late: 'bg-red-600', soon: 'bg-orange-500', ok: 'bg-emerald-600', plain: 'bg-slate-500' }[card.due.tone])}>
                            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="text-[12px] font-bold tabular-nums">{card.due.date.slice(0, 5)}</span>
                            <span className="ml-auto inline-flex min-w-0 items-center gap-1 text-[12px] font-bold">
                              {createElement(card.due.tone === 'plain' ? Clock : dueIcon(card.due.days), { className: 'size-3.5 shrink-0', 'aria-hidden': true })}<span className="truncate first-letter:uppercase">{card.due.text}</span>
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
      <CargoRequestDialog request={request} onClose={() => setRequest(null)} onChange={r => { setRequest(r); setTick(t => t + 1) }} />
    </div>
  )
}
