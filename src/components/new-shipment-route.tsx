'use client'

import { Ship, Filter, DollarSign, ArrowRightLeft, Plus, X } from 'lucide-react'
import { SearchableSelect } from '@/components/searchable-select'
import type { TransshipmentPosition } from '@/lib/shipment-route'

type CityOptions = { value: string; label: string }[]
type StationOptions = { value: string; label: string }[]

type Props = {
  row: Record<string, string>
  setField: (key: string, value: string) => void
  cityOptions: CityOptions
  stationOptions: StationOptions
}

function RouteNode({
  icon: Icon,
  title,
  filled,
  accent,
}: {
  icon: typeof Ship
  title: string
  filled: boolean
  accent?: 'violet' | 'slate' | 'emerald' | 'indigo'
}) {
  const ring =
    accent === 'violet'
      ? 'bg-violet-600 text-white shadow-md'
      : accent === 'emerald'
        ? 'bg-emerald-500 text-white shadow-md'
        : accent === 'indigo'
          ? 'bg-indigo-500 text-white shadow-md'
          : filled
            ? 'bg-slate-600 text-white shadow-md'
            : 'bg-white ring-2 ring-dashed ring-slate-300 text-slate-400'

  return (
    <div className="flex flex-col items-center shrink-0 min-w-[72px]">
      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${ring}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1.5 text-center leading-tight">{title}</p>
    </div>
  )
}

function Connector({ active }: { active?: boolean }) {
  return <div className={`flex-1 min-w-[12px] h-0.5 mt-5 rounded-full ${active ? 'bg-slate-400' : 'bg-slate-200'}`} />
}

function AddTransshipmentBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 mt-2 flex flex-col items-center gap-1 px-1 group"
      title={label}
    >
      <span className="w-7 h-7 rounded-full border border-dashed border-violet-300 bg-violet-50/80 text-violet-600 flex items-center justify-center group-hover:bg-violet-100 group-hover:border-violet-400 transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </span>
      <span className="text-[9px] font-semibold text-violet-600/90 text-center leading-tight max-w-[72px]">{label}</span>
    </button>
  )
}

export function NewShipmentRoute({ row, setField, cityOptions, stationOptions }: Props) {
  const position = (row.transshipment_position as TransshipmentPosition) || ''
  const hasTrans = position === 'before_border' || position === 'after_border'

  const addTransshipment = (pos: TransshipmentPosition) => {
    setField('transshipment_position', pos)
  }

  const removeTransshipment = () => {
    setField('transshipment_position', '')
    setField('transshipment_location', '')
    setField('transshipment_date', '')
  }

  const showBeforeSlot = !hasTrans || position === 'before_border'
  const showAfterSlot = !hasTrans || position === 'after_border'

  return (
    <div className="space-y-3">
      <div className="hidden sm:flex items-start gap-0.5 min-h-[76px]">
        <RouteNode icon={Ship} title="Откуда" filled={!!row.origin} accent={row.origin ? 'slate' : undefined} />

        <Connector active={!!row.origin && (position === 'before_border' ? !!row.transshipment_location : !!row.destination_station)} />

        {showBeforeSlot && (
          position === 'before_border' ? (
            <>
              <div className="flex flex-col items-center shrink-0 min-w-[88px]">
                <div className="relative">
                  <RouteNode icon={ArrowRightLeft} title="Перевалка" filled={!!row.transshipment_location} accent="violet" />
                  <button
                    type="button"
                    onClick={removeTransshipment}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center"
                    title="Убрать перевалку"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[9px] text-violet-600 font-medium mt-0.5">до границы</p>
              </div>
              <Connector active={!!row.transshipment_location && !!row.destination_station} />
            </>
          ) : (
            <AddTransshipmentBtn label="Перевалка до границы" onClick={() => addTransshipment('before_border')} />
          )
        )}

        <RouteNode icon={Filter} title="Граница" filled={!!row.destination_station} accent={row.destination_station ? 'slate' : undefined} />

        <Connector active={!!row.destination_station && (position === 'after_border' ? !!row.transshipment_location : !!row.destination_city)} />

        {showAfterSlot && (
          position === 'after_border' ? (
            <>
              <div className="flex flex-col items-center shrink-0 min-w-[88px]">
                <div className="relative">
                  <RouteNode icon={ArrowRightLeft} title="Перевалка" filled={!!row.transshipment_location} accent="violet" />
                  <button
                    type="button"
                    onClick={removeTransshipment}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center"
                    title="Убрать перевалку"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
                <p className="text-[9px] text-violet-600 font-medium mt-0.5">после границы</p>
              </div>
              <Connector active={!!row.transshipment_location && !!row.destination_city} />
            </>
          ) : (
            <AddTransshipmentBtn label="Перевалка после границы" onClick={() => addTransshipment('after_border')} />
          )
        )}

        <RouteNode icon={Ship} title="Доставка" filled={!!row.destination_city} accent={row.destination_city ? 'emerald' : undefined} />

        <div className="w-3 shrink-0" />

        <RouteNode icon={DollarSign} title="Стоимость" filled={!!row.delivery_cost} accent={row.delivery_cost ? 'indigo' : undefined} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SearchableSelect options={cityOptions} value={row.origin || ''} onChange={v => setField('origin', v)} placeholder="Пункт отправления" />
        <SearchableSelect options={stationOptions} value={row.destination_station || ''} onChange={v => setField('destination_station', v)} placeholder="Погранпереход" />
        <SearchableSelect options={cityOptions} value={row.destination_city || ''} onChange={v => setField('destination_city', v)} placeholder="Пункт доставки" />
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium pointer-events-none">$</span>
          <input
            type="number"
            placeholder="Стоимость доставки"
            value={row.delivery_cost || ''}
            onChange={e => setField('delivery_cost', e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300"
          />
        </div>
      </div>

      {hasTrans && (
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            options={cityOptions}
            value={row.transshipment_location || ''}
            onChange={v => setField('transshipment_location', v)}
            placeholder={`Перевалка (${position === 'before_border' ? 'до границы' : 'после границы'})`}
          />
          <input
            type="date"
            value={row.transshipment_date || ''}
            onChange={e => setField('transshipment_date', e.target.value)}
            className="h-9 w-full rounded-lg border border-violet-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-300"
            title="Дата перевалки"
          />
        </div>
      )}

      <p className="text-[10px] text-slate-400 px-0.5 sm:hidden">
        На мобильном: «Перевалка до границы» — порт/склад перед погранпереходом; «после границы» — хаб уже в КЗ/РФ.
      </p>
    </div>
  )
}
