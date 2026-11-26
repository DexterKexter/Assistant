'use client'

import { Fragment, useRef } from 'react'
import { Package, Anchor, Ship, Flag, Stamp, CircleCheck } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import type { Shipment } from '@/types/database'

export type TimelineField = 'loading_date' | 'export_date' | 'departure_date' | 'arrival_date' | 'customs_date' | 'delivery_date'
const DAY = 86400000

// Same six stages as the pipeline board. Export and customs are optional: an empty one before a filled one reads "пропущен".
export function ShipmentTimeline({ shipment: s, canEdit, onDate }: { shipment: Shipment; canEdit: boolean; onDate: (field: TimelineField, value: string) => void }) {
  // Imported shipments were created long after they actually moved: only trust created_at when it precedes the first real date.
  const created = s.created_at?.slice(0, 10) ?? null
  const first = s.export_date || s.departure_date || s.arrival_date || s.customs_date || s.delivery_date
  const loaded = s.loading_date || (created && (!first || created <= first) ? created : null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const steps: { title: string; place?: string | null; icon: typeof Ship; date: string | null; field?: TimelineField }[] = [
    { title: 'Загрузка', place: s.origin, icon: Package, date: loaded, field: 'loading_date' },
    { title: 'Экспорт', icon: Anchor, date: s.export_date, field: 'export_date' },
    { title: 'В пути', icon: Ship, date: s.departure_date, field: 'departure_date' },
    { title: 'Граница', place: s.destination_station, icon: Flag, date: s.arrival_date, field: 'arrival_date' },
    { title: 'Таможня', icon: Stamp, date: s.customs_date, field: 'customs_date' },
    { title: 'Доставлен', place: s.destination_city, icon: CircleCheck, date: s.delivery_date, field: 'delivery_date' },
  ]
  const done = !!(s.delivery_date || s.is_completed)
  const last = done ? steps.length - 1 : steps.reduce((acc, st, i) => (st.date ? i : acc), 0)
  const now = new Date()

  return (
    <div className="overflow-x-auto rounded-2xl bg-white px-4 py-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]">
      <div className="flex min-w-[640px] items-start">
        {steps.map((st, i) => {
          const reached = i === 0 || (i <= last && (!!st.date || i === last))
          const skipped = i > 0 && i < last && !st.date
          // Days from this stage to the next filled one; for the current stage — days so far.
          const next = steps.slice(i + 1).find(n => n.date)
          const span = st.date && i < steps.length - 1 && (next || (i === last && !done))
            ? Math.max(0, Math.round(((next?.date ? new Date(next.date) : now).getTime() - new Date(st.date).getTime()) / DAY))
            : null
          const editable = canEdit && !!st.field
          return (
            <Fragment key={st.title}>
              <div className="w-[92px] shrink-0 text-center">
                <button type="button" disabled={!editable} onClick={() => inputs.current[st.title]?.showPicker()}
                  aria-label={`${st.title}: ${st.date ? fmtDate(st.date) : 'указать дату'}`}
                  className={cn('mx-auto flex size-9 items-center justify-center rounded-full transition',
                    reached ? (i === steps.length - 1 ? 'bg-emerald-500 text-white' : i === last ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-800 text-white')
                      : 'bg-slate-100 text-slate-400 ring-2 ring-dashed ring-slate-300',
                    editable && 'cursor-pointer hover:ring-indigo-300')}>
                  <st.icon className="size-4" />
                </button>
                {st.field && <input ref={el => { inputs.current[st.title] = el }} type="date" tabIndex={-1} className="sr-only" defaultValue={st.date ?? ''}
                  onChange={e => e.target.value && onDate(st.field!, e.target.value)} />}
                <p className={cn('mt-1.5 text-[12px] font-bold leading-tight', reached ? 'text-slate-900' : 'text-slate-400')}>{st.title}</p>
                {st.place && <p className="truncate text-[10.5px] text-slate-500" title={st.place}>{st.place}</p>}
                <p className="mt-0.5 text-[10.5px] tabular-nums text-slate-500">
                  {st.date ? fmtDate(st.date) : skipped ? <span className="text-slate-300">пропущен</span> : editable ? <span className="text-indigo-500">+ дата</span> : '—'}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex min-w-6 flex-1 flex-col items-center" style={{ marginTop: 17 }}>
                  <div className={cn('h-0.5 w-full rounded-full', i < last ? 'bg-slate-400' : 'bg-slate-200')} />
                  {span !== null && <span className={cn('mt-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold', i === last ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700')}>{span}д</span>}
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
