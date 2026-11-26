'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// A spreadsheet, not a form: every cell is editable in place and saves when you leave it.
type Price = {
  id: string; origin: string; destination: string; transport: string; container: string
  price: number | null; currency: string; transit_days: string; notes: string
  isNew?: boolean // not in the database yet: it is inserted once both ends of the route are filled
}
type Field = Exclude<keyof Price, 'id' | 'isNew'>

const TRANSPORTS = ['Море + ж/д', 'Море', 'Ж/д', 'Авто', 'Авиа', 'Мультимодальная']
const CONTAINERS = ['20 ft', '40 ft', '40 HC', 'Сборный груз']
const CURRENCIES = ['USD', 'KZT', 'RUB', 'AED', 'CNY', 'EUR']

const cell = 'h-10 w-full rounded-md bg-transparent px-2.5 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-300 hover:bg-slate-100/70 focus:bg-white focus:ring-1 focus:ring-inset focus:ring-slate-400'

function Text({ value, onSave, placeholder, className, inputMode }: { value: string; onSave: (v: string) => void; placeholder?: string; className?: string; inputMode?: 'decimal' }) {
  return (
    <input defaultValue={value} placeholder={placeholder} inputMode={inputMode} aria-label={placeholder}
      onBlur={e => { const v = e.target.value.trim(); if (v !== value) onSave(v) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className={cn(cell, className)} />
  )
}

function Pick({ value, options, onSave, label, className }: { value: string; options: string[]; onSave: (v: string) => void; label: string; className?: string }) {
  return (
    <select value={value} aria-label={label} onChange={e => onSave(e.target.value)} className={cn(cell, 'cursor-pointer appearance-none', !value && 'text-slate-300', className)}>
      <option value="">—</option>
      {(options.includes(value) || !value ? options : [value, ...options]).map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

export default function PricesPage() {
  const [rows, setRows] = useState<Price[] | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'' | 'saving' | 'saved'>('')
  const [search, setSearch] = useState('')
  const [bump, setBump] = useState(0) // remounts cells to discard a rejected edit

  useEffect(() => {
    createClient().from('prices').select('id, origin, destination, transport, container, price, currency, transit_days, notes')
      .order('origin').order('destination').then(({ data, error }) => {
        if (error) setError('Не удалось загрузить цены. Обновите страницу.')
        else setRows(data as Price[])
      })
  }, [])

  async function save(row: Price, field: Field, raw: string) {
    let value: string | number | null = raw
    if (field === 'price') {
      value = raw === '' ? null : Number(raw.replace(',', '.').replace(/\s/g, ''))
      if (value !== null && (!Number.isFinite(value) || value < 0)) { setError('Цена должна быть числом, например 4500.'); setBump(b => b + 1); return }
    }
    if ((field === 'origin' || field === 'destination') && raw === '' && !row.isNew) { setError('У маршрута должны быть «Откуда» и «Куда».'); setBump(b => b + 1); return }

    const next = { ...row, [field]: value } as Price
    const ready = !!next.origin && !!next.destination
    setError('')
    setRows(rs => rs!.map(r => (r.id === row.id ? { ...next, isNew: row.isNew && !ready } : r)))
    if (row.isNew && !ready) return

    setStatus('saving')
    const supabase = createClient()
    const { isNew, ...data } = next
    const { error } = isNew
      ? await supabase.from('prices').insert(data)
      : await supabase.from('prices').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) { setStatus(''); setError('Не сохранилось. Проверьте соединение и повторите.'); return }
    setStatus('saved')
  }

  async function remove(row: Price) {
    if (!row.isNew) {
      if (!confirm(`Удалить ${row.origin} → ${row.destination}? Вернуть строку будет нельзя.`)) return
      const { error } = await createClient().from('prices').delete().eq('id', row.id)
      if (error) { setError('Не удалось удалить.'); return }
    }
    setRows(rs => rs!.filter(r => r.id !== row.id))
  }

  const add = () => {
    setSearch('')
    setRows(rs => [{ id: crypto.randomUUID(), origin: '', destination: '', transport: TRANSPORTS[0], container: '40 ft', price: null, currency: 'USD', transit_days: '', notes: '', isNew: true }, ...(rs || [])])
  }

  const q = search.trim().toLowerCase()
  const shown = (rows || []).filter(r => r.isNew || !q || [r.origin, r.destination, r.transport, r.container, r.notes].some(v => v.toLowerCase().includes(q)))
  const th = 'px-2.5 pb-2 text-left text-[11px] font-medium text-slate-400'

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Цены</h1>
        <p role="status" className="text-[12px] text-slate-400">{status === 'saving' ? 'Сохраняем…' : status === 'saved' ? 'Сохранено' : rows?.length ? 'Правьте прямо в таблице — сохраняется само' : ''}</p>
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск" aria-label="Поиск по ценам"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400" />
        </label>
        <button onClick={add} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-semibold text-white hover:bg-slate-800"><Plus className="size-4" />Маршрут</button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

      {!rows && !error && <div role="status" aria-label="Загружаем цены" className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}</div>}

      {rows && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-slate-700">{rows.length ? 'Ничего не найдено' : 'Здесь будет прайс-лист'}</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-400">{rows.length ? 'Измените запрос.' : 'Маршрут, транспорт, контейнер, цена, срок и примечание — одной строкой.'}</p>
          {!rows.length && <button onClick={add} className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800"><Plus className="size-4" />Добавить первый маршрут</button>}
        </div>
      )}

      {rows && shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0">
            <colgroup><col className="w-[15%]" /><col className="w-[15%]" /><col className="w-[14%]" /><col className="w-[11%]" /><col className="w-[15%]" /><col className="w-[11%]" /><col /><col className="w-10" /></colgroup>
            <thead>
              <tr>
                <th className={th}>Откуда</th><th className={th}>Куда</th><th className={th}>Транспорт</th><th className={th}>Контейнер</th>
                <th className={cn(th, 'text-right')}>Цена</th><th className={th}>Срок</th><th className={th}>Примечание</th><th />
              </tr>
            </thead>
            <tbody key={bump}>
              {shown.map(r => (
                <tr key={r.id} className={cn('group', r.isNew && 'bg-amber-50/50')}>
                  <td className="border-t border-slate-100 p-0.5"><Text value={r.origin} onSave={v => save(r, 'origin', v)} placeholder="Дубай" className="font-semibold" /></td>
                  <td className="border-t border-slate-100 p-0.5"><Text value={r.destination} onSave={v => save(r, 'destination', v)} placeholder="Алматы" className="font-semibold" /></td>
                  <td className="border-t border-slate-100 p-0.5"><Pick value={r.transport} options={TRANSPORTS} onSave={v => save(r, 'transport', v)} label="Транспорт" /></td>
                  <td className="border-t border-slate-100 p-0.5"><Pick value={r.container} options={CONTAINERS} onSave={v => save(r, 'container', v)} label="Контейнер" /></td>
                  <td className="border-t border-slate-100 p-0.5">
                    <div className="flex items-center">
                      <Text value={r.price == null ? '' : Number(r.price).toLocaleString('ru-RU')} onSave={v => save(r, 'price', v)} placeholder="Цена" inputMode="decimal" className="min-w-0 flex-1 text-right font-semibold tabular-nums" />
                      <Pick value={r.currency} options={CURRENCIES} onSave={v => save(r, 'currency', v || 'USD')} label="Валюта" className="w-[58px] shrink-0 px-1.5 text-[12px] text-slate-500" />
                    </div>
                  </td>
                  <td className="border-t border-slate-100 p-0.5"><Text value={r.transit_days} onSave={v => save(r, 'transit_days', v)} placeholder="30–40 дней" /></td>
                  <td className="border-t border-slate-100 p-0.5"><Text value={r.notes} onSave={v => save(r, 'notes', v)} placeholder="Что входит, условия" className="text-slate-600" /></td>
                  <td className="border-t border-slate-100 p-0.5 text-center">
                    <button onClick={() => remove(r)} aria-label={`Удалить ${r.origin || 'новую строку'}`} title="Удалить"
                      className="inline-flex size-8 items-center justify-center rounded-md text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
