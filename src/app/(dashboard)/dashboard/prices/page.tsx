'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Price = {
  id: string; origin: string; destination: string; transport: string; container: string
  price: number | null; currency: string; transit_days: string; notes: string; updated_at: string
}
type Draft = Omit<Price, 'id' | 'updated_at' | 'price'> & { id?: string; price: string }

const TRANSPORTS = ['Море + ж/д', 'Море', 'Ж/д', 'Авто', 'Авиа']
const CONTAINERS = ['20 ft', '40 ft', '40 HC', 'Сборный']
const CURRENCIES = ['USD', 'KZT', 'RUB', 'AED', 'CNY', 'EUR']
const empty: Draft = { origin: '', destination: '', transport: TRANSPORTS[0], container: '40 ft', price: '', currency: 'USD', transit_days: '', notes: '' }

const field = 'h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900'
const caption = 'mb-1.5 block text-[12px] font-medium text-slate-500'
const money = (p: Price) => (p.price == null ? 'по запросу' : `${Number(p.price).toLocaleString('ru-RU')} ${p.currency}`)

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className={caption}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? '' : o)}
            className={cn('h-9 rounded-lg border px-3 text-[13px] font-medium', value === o ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>{o}</button>
        ))}
      </div>
    </fieldset>
  )
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<Price | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    createClient().from('prices').select('*').order('origin').order('destination').then(({ data, error }) => {
      if (error) setError('Не удалось загрузить цены. Обновите страницу.')
      else setPrices(data as Price[])
    })
  }, [version])

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const openForm = (d: Draft) => { setFormError(''); setView(null); setDraft(d) }
  const q = search.trim().toLowerCase()
  const shown = (prices || []).filter(p => !q || [p.origin, p.destination, p.transport, p.container, p.notes].some(v => v.toLowerCase().includes(q)))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const price = draft.price.trim() === '' ? null : Number(draft.price.replace(',', '.').replace(/\s/g, ''))
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setFormError('Цена должна быть числом, например 4500.'); return }
    setSaving(true); setFormError('')
    const { id, ...rest } = draft
    const row = { ...rest, origin: rest.origin.trim(), destination: rest.destination.trim(), price, updated_at: new Date().toISOString() }
    const supabase = createClient()
    const { error } = id ? await supabase.from('prices').update(row).eq('id', id) : await supabase.from('prices').insert(row)
    setSaving(false)
    if (error) { setFormError('Не сохранилось. Проверьте соединение и повторите.'); return }
    setDraft(null); setVersion(v => v + 1)
  }

  async function remove(p: Price) {
    if (!confirm(`Удалить цену ${p.origin} → ${p.destination}? Вернуть её будет нельзя.`)) return
    const { error } = await createClient().from('prices').delete().eq('id', p.id)
    if (error) { setError('Не удалось удалить.'); return }
    setView(null); setVersion(v => v + 1)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Цены</h1>
        {!!prices?.length && <span className="text-[13px] tabular-nums text-slate-400">{prices.length}</span>}
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по маршруту" aria-label="Поиск по ценам"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-400" />
        </label>
        <button onClick={() => openForm(empty)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800"><Plus className="size-4" />Добавить цену</button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        {!prices && !error ? <div role="status" aria-label="Загружаем цены" className="space-y-2 p-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-11 w-full rounded-lg" />)}</div>
        : shown.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-slate-700">{prices?.length ? 'Ничего не найдено' : 'Прайс-лист пуст'}</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-400">{prices?.length ? 'Измените запрос.' : 'Добавьте маршрут: откуда, куда, транспорт, контейнер и цену.'}</p>
            {!prices?.length && <button onClick={() => openForm(empty)} className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800"><Plus className="size-4" />Добавить цену</button>}
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[12px] text-slate-500">
                <th className="px-4 py-2.5 font-medium">Маршрут</th>
                <th className="px-4 py-2.5 font-medium">Транспорт</th>
                <th className="px-4 py-2.5 font-medium">Контейнер</th>
                <th className="px-4 py-2.5 font-medium">Срок</th>
                <th className="px-4 py-2.5 text-right font-medium">Цена</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(p => (
                <tr key={p.id} tabIndex={0} role="button" aria-label={`Открыть ${p.origin} → ${p.destination}`}
                  onClick={() => setView(p)} onKeyDown={e => { if (e.key === 'Enter') setView(p) }}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-900">{p.origin}<ArrowRight className="size-3.5 shrink-0 text-slate-300" />{p.destination}</p>
                    {p.notes && <p className="mt-0.5 max-w-[360px] truncate text-[12px] text-slate-400">{p.notes}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.transport || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.container || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.transit_days || '—'}</td>
                  <td className={cn('whitespace-nowrap px-4 py-3 text-right tabular-nums', p.price == null ? 'text-slate-400' : 'font-semibold text-slate-900')}>{money(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Card: everything about one price, read-only */}
      <Dialog open={!!view} onOpenChange={open => { if (!open) setView(null) }}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          {view && <>
            <DialogHeader className="border-b border-slate-100 p-6 pb-5">
              <DialogDescription className="text-[12px] text-slate-400">Цена перевозки</DialogDescription>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6 font-heading text-[20px] font-bold leading-tight text-slate-900">{view.origin}<ArrowRight className="size-4 text-slate-300" />{view.destination}</DialogTitle>
              <p className={cn('pt-2 font-heading text-[30px] font-extrabold leading-none tracking-tight tabular-nums', view.price == null ? 'text-slate-400' : 'text-slate-900')}>{money(view)}</p>
            </DialogHeader>
            <dl className="grid grid-cols-[110px_1fr] gap-y-3 p-6 text-[14px]">
              <dt className="text-slate-400">Транспорт</dt><dd className="text-slate-900">{view.transport || '—'}</dd>
              <dt className="text-slate-400">Контейнер</dt><dd className="text-slate-900">{view.container || '—'}</dd>
              <dt className="text-slate-400">Срок</dt><dd className="text-slate-900">{view.transit_days || '—'}</dd>
              <dt className="text-slate-400">Обновлено</dt><dd className="text-slate-900">{new Date(view.updated_at).toLocaleDateString('ru-RU')}</dd>
              {view.notes && <><dt className="text-slate-400">Примечание</dt><dd className="whitespace-pre-wrap text-slate-700">{view.notes}</dd></>}
            </dl>
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button onClick={() => openForm({ ...view, price: view.price == null ? '' : String(view.price) })} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[14px] font-semibold text-white hover:bg-slate-800"><Pencil className="size-4" />Изменить</button>
              <button onClick={() => remove(view)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-[14px] font-medium text-red-600 hover:bg-red-50"><Trash2 className="size-4" />Удалить</button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      {/* Form: add or edit */}
      <Dialog open={!!draft} onOpenChange={open => { if (!open && !saving) setDraft(null) }}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {draft && (
            <form onSubmit={save}>
              <DialogHeader className="border-b border-slate-100 p-6 pb-5">
                <DialogTitle className="font-heading text-[18px] font-bold text-slate-900">{draft.id ? 'Изменить цену' : 'Новая цена'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 p-6">
                <div>
                  <span className={caption}>Маршрут</span>
                  <div className="flex items-center gap-2">
                    <input required maxLength={160} autoFocus value={draft.origin} onChange={e => set({ origin: e.target.value })} placeholder="Откуда" aria-label="Откуда" className={field} />
                    <ArrowRight className="size-4 shrink-0 text-slate-300" />
                    <input required maxLength={160} value={draft.destination} onChange={e => set({ destination: e.target.value })} placeholder="Куда" aria-label="Куда" className={field} />
                  </div>
                </div>
                <Chips label="Транспорт" options={TRANSPORTS} value={draft.transport} onChange={transport => set({ transport })} />
                <Chips label="Контейнер" options={CONTAINERS} value={draft.container} onChange={container => set({ container })} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={caption}>Цена</span>
                    <div className="flex gap-2">
                      <input inputMode="decimal" value={draft.price} onChange={e => set({ price: e.target.value })} placeholder="4500" aria-label="Цена" className={cn(field, 'tabular-nums')} />
                      <select aria-label="Валюта" value={draft.currency} onChange={e => set({ currency: e.target.value })} className="h-11 w-[78px] shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-[14px] outline-none focus:border-slate-900">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select>
                    </div>
                  </div>
                  <label><span className={caption}>Срок</span><input maxLength={40} value={draft.transit_days} onChange={e => set({ transit_days: e.target.value })} placeholder="30–40 дней" className={field} /></label>
                </div>
                <label className="block"><span className={caption}>Примечание</span>
                  <textarea rows={3} maxLength={2000} value={draft.notes} onChange={e => set({ notes: e.target.value })} placeholder="Что входит в цену, условия, до какой даты действует" className={cn(field, 'h-auto resize-none py-2.5')} />
                </label>
                {formError && <p role="alert" className="text-[13px] text-red-600">{formError}</p>}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <button type="button" disabled={saving} onClick={() => setDraft(null)} className="h-10 rounded-lg px-4 text-[14px] font-medium text-slate-600 hover:bg-slate-100">Отмена</button>
                <button type="submit" disabled={saving} className="h-10 rounded-lg bg-slate-900 px-5 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? 'Сохраняем…' : 'Сохранить'}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
