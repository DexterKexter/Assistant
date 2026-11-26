'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Price = {
  id: string; origin: string; destination: string; transport: string; container: string
  price: number | null; currency: string; transit_days: string; notes: string; updated_at: string
}
type Draft = Omit<Price, 'id' | 'updated_at' | 'price'> & { id?: string; price: string }

const TRANSPORTS = ['Море + ж/д', 'Море', 'Ж/д', 'Авто', 'Авиа', 'Мультимодальная']
const CONTAINERS = ['20 ft', '40 ft', '40 HC', 'Сборный груз']
const CURRENCIES = ['USD', 'KZT', 'RUB', 'AED', 'CNY', 'EUR']
const empty: Draft = { origin: '', destination: '', transport: TRANSPORTS[0], container: '40 ft', price: '', currency: 'USD', transit_days: '', notes: '' }
const field = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-900 outline-none focus:border-slate-400'
const label = 'space-y-1.5 text-xs text-slate-600'
const money = (p: Price) => (p.price == null ? '—' : `${Number(p.price).toLocaleString('ru-RU')} ${p.currency}`)

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    createClient().from('prices').select('*').order('origin').order('destination').then(({ data, error }) => {
      if (error) setError('Не удалось загрузить цены. Обновите страницу.')
      else setPrices(data as Price[])
    })
  }, [version])

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const q = search.trim().toLowerCase()
  const shown = (prices || []).filter(p => !q || [p.origin, p.destination, p.transport, p.container, p.notes].some(v => v.toLowerCase().includes(q)))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const price = draft.price.trim() === '' ? null : Number(draft.price.replace(',', '.').replace(/\s/g, ''))
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setSaveError('Цена должна быть числом.'); return }
    setSaving(true); setSaveError('')
    const { id, ...rest } = draft
    const row = { ...rest, origin: rest.origin.trim(), destination: rest.destination.trim(), price, updated_at: new Date().toISOString() }
    const supabase = createClient()
    const { error } = id ? await supabase.from('prices').update(row).eq('id', id) : await supabase.from('prices').insert(row)
    setSaving(false)
    if (error) { setSaveError('Не удалось сохранить. Попробуйте ещё раз.'); return }
    setDraft(null); setVersion(v => v + 1)
  }

  async function remove() {
    if (!draft?.id || !confirm(`Удалить цену ${draft.origin} → ${draft.destination}? Вернуть её будет нельзя.`)) return
    setSaving(true)
    const { error } = await createClient().from('prices').delete().eq('id', draft.id)
    setSaving(false)
    if (error) { setSaveError('Не удалось удалить.'); return }
    setDraft(null); setVersion(v => v + 1)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Цены</h1>
        <Button onClick={() => { setSaveError(''); setDraft(empty) }} className="h-9 bg-slate-900 text-white"><Plus className="size-4" />Добавить цену</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Маршрут, транспорт, примечание" aria-label="Поиск по ценам" className="h-9 bg-white pl-9" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white">
        {!prices && !error ? <div role="status" aria-label="Загружаем цены" className="space-y-2 p-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}</div>
        : shown.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Tag className="mx-auto mb-3 size-10 text-slate-200" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-slate-500">{prices?.length ? 'Ничего не найдено' : 'Цен пока нет'}</p>
            <p className="mt-1 text-[12px] text-slate-400">{prices?.length ? 'Измените запрос.' : 'Добавьте первый маршрут — откуда, куда, транспорт и цену.'}</p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
              <tr>{['Маршрут', 'Транспорт', 'Контейнер', 'Цена', 'Срок', 'Примечание', 'Обновлено'].map(h => <th key={h} className={`px-4 py-2.5 font-medium ${h === 'Цена' ? 'text-right' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map(p => (
                <tr key={p.id} tabIndex={0} role="button" aria-label={`Изменить цену ${p.origin} → ${p.destination}`}
                  onClick={() => { setSaveError(''); setDraft({ ...p, price: p.price == null ? '' : String(p.price) }) }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.click() }}
                  className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-900">{p.origin} <span className="font-normal text-slate-400">→</span> {p.destination}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.transport || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.container || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(p)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{p.transit_days || '—'}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-slate-500" title={p.notes}>{p.notes || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">{new Date(p.updated_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={open => { if (!open && !saving) setDraft(null) }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{draft?.id ? 'Изменить цену' : 'Новая цена'}</DialogTitle></DialogHeader>
          {draft && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={label}><span>Откуда *</span><Input required maxLength={160} value={draft.origin} onChange={e => set({ origin: e.target.value })} placeholder="Дубай" className="h-10 bg-white" /></label>
                <label className={label}><span>Куда *</span><Input required maxLength={160} value={draft.destination} onChange={e => set({ destination: e.target.value })} placeholder="Алматы" className="h-10 bg-white" /></label>
                <label className={label}><span>Тип транспорта</span>
                  <input list="price-transports" maxLength={80} value={draft.transport} onChange={e => set({ transport: e.target.value })} className={field} />
                  <datalist id="price-transports">{TRANSPORTS.map(t => <option key={t} value={t} />)}</datalist>
                </label>
                <label className={label}><span>Контейнер</span>
                  <input list="price-containers" maxLength={40} value={draft.container} onChange={e => set({ container: e.target.value })} className={field} />
                  <datalist id="price-containers">{CONTAINERS.map(t => <option key={t} value={t} />)}</datalist>
                </label>
                <label className={label}><span>Цена</span>
                  <div className="flex gap-2">
                    <Input inputMode="decimal" value={draft.price} onChange={e => set({ price: e.target.value })} placeholder="4500" className="h-10 flex-1 bg-white" />
                    <select aria-label="Валюта" value={draft.currency} onChange={e => set({ currency: e.target.value })} className={`${field} w-[84px] px-2`}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select>
                  </div>
                </label>
                <label className={label}><span>Срок</span><Input maxLength={40} value={draft.transit_days} onChange={e => set({ transit_days: e.target.value })} placeholder="30–40 дней" className="h-10 bg-white" /></label>
              </div>
              <label className={`${label} block`}><span>Примечание</span>
                <textarea rows={3} maxLength={2000} value={draft.notes} onChange={e => set({ notes: e.target.value })} placeholder="Что входит в цену, условия, до какой даты действует" className={`${field} h-auto py-2`} />
              </label>
              {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="h-10 flex-1 bg-slate-900 text-white">{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
                {draft.id && <Button type="button" variant="outline" disabled={saving} onClick={remove} className="h-10 text-red-600">Удалить</Button>}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
