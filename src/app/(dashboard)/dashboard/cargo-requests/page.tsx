'use client'

import { use, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { ClipboardList, ExternalLink, Plus, Search, X, Ship, Filter, Send, Phone, Truck, Save } from 'lucide-react'
import { SearchableSelect } from '@/components/searchable-select'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { CARGO_STATUSES, VIA_OPTIONS, cargoContactError, carrierRequestText, type CargoRequest } from '@/lib/cargo-requests'
import { editContainerNumber } from '@/lib/container-number'
import { Input } from '@/components/ui/input'
import { CargoRequestDialog } from '@/components/cargo-request-dialog'
import { Button } from '@/components/ui/button'

const emptyDraft = { client_name: '', phone: '', container_number: '', origin: '', destination: '', loading_date: '', supplier: '', carrier_id: '', sender_id: '', shipper_phone: '', weight_kg: '', container_size: '40', container_owner: '', via: '' }
// Classes shared with the new shipment window (shipments/page.tsx).
const inpCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300'
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500'
const sectionCls = 'mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const cardCls = 'rounded-2xl bg-white/60 p-4 ring-1 ring-white/80'
const pill = (label: string, active: boolean, onClick: () => void) => (
  <button key={label} type="button" onClick={onClick} aria-pressed={active}
    className={`h-7 rounded-full border px-3 text-[11px] font-medium transition-all ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>{label}</button>
)
// Round icon above a field; `color` is set once the field is filled.
const step = (icon: ReactNode, label: string, color: string) => (
  <div className="flex flex-col items-center">
    <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all ${color ? `${color} text-white shadow-md` : 'bg-white text-slate-400 ring-2 ring-dashed ring-slate-300'}`}>{icon}</div>
    <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
  </div>
)
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU')

export default function CargoRequestsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { hasRole, loading: profileLoading } = useProfile()
  const canManage = hasRole('admin', 'manager')
  const [requests, setRequests] = useState<CargoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<CargoRequest | null>(null)
  // ?new opens the dialog straight away (the "Новая заявка" button on the shipments page).
  const [createOpen, setCreateOpen] = useState(use(searchParams).new !== undefined)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [sendFailed, setSendFailed] = useState(false)
  // Carriers with a Telegram group: a request created for one is posted to that group by the bot.
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    createClient().from('carriers').select('id, name').not('telegram_chat_id', 'is', null).order('name')
      .then(({ data }) => setCarriers(data ?? []))
  }, [])
  const [senders, setSenders] = useState<{ id: string; name: string; phone: string | null }[]>([])
  useEffect(() => {
    createClient().from('senders').select('id, name, phone').order('name').then(({ data }) => setSenders(data ?? []))
  }, [version])
  const draftSender = senders.find(s => s.id === draft.sender_id)
  const set = (key: keyof typeof emptyDraft, value: string) => setDraft(d => ({ ...d, [key]: value }))
  const closeCreate = () => { if (!saving) setCreateOpen(false) }

  useEffect(() => {
    if (!canManage) return
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data, error } = await createClient().from('cargo_requests').select('*, cargo_request_items(*), cargo_request_replies(*)').order('created_at', { ascending: false }).abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (error) throw error
        setRequests(data as CargoRequest[])
      } catch {
        if (!controller.signal.aborted) setError('Не удалось загрузить заявки. Попробуйте ещё раз.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [canManage, version])

  async function saveDraft(event: FormEvent) {
    event.preventDefault()
    const validation = cargoContactError(draft)
    if (validation) { setSaveError(validation); return }
    setSaving(true)
    setSaveError('')
    try {
      const shipper_phone = draft.shipper_phone.trim() || null
      const { data, error } = await createClient().from('cargo_requests').insert({
        ...draft, client_name: draft.client_name.trim(), container_number: draft.container_number || null,
        loading_date: draft.loading_date || null, supplier: draft.supplier.trim() || null, carrier_id: draft.carrier_id || null,
        sender_id: draft.sender_id || null, shipper_phone, weight_kg: draft.weight_kg ? Number(draft.weight_kg) : null,
        container_size: Number(draft.container_size), container_owner: draft.container_owner || null, via: draft.via || null, status: 'draft',
      }).select('id').single()
      if (error) throw error
      // The shipper's phone lives on the sender, so next time it is prefilled.
      if (draftSender && shipper_phone && shipper_phone !== draftSender.phone) await createClient().from('senders').update({ phone: shipper_phone }).eq('id', draftSender.id)
      if (draft.carrier_id) {
        const res = await fetch('/api/cargo-request/carrier', { method: 'POST', body: JSON.stringify({ id: data.id }) })
        setSendFailed(!res.ok)
      }
      setCreateOpen(false)
      setDraft(emptyDraft)
      setVersion(v => v + 1)
    } catch {
      setSaveError('Не удалось сохранить черновик. Данные остались в форме — попробуйте ещё раз.')
    } finally { setSaving(false) }
  }

  if (profileLoading) return <p className="p-6 text-sm text-slate-500">Загружаем заявки…</p>
  if (!canManage) return <p className="p-6 text-sm text-slate-600">Заявки доступны менеджерам и администратору.</p>

  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = requests.filter(r => (status === 'all' || r.status === status) && `${r.request_number} ${r.client_name} ${r.container_number ?? ''}`.toLocaleLowerCase('ru').includes(query))

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Заявки на груз</h1>
        <div className="flex gap-2">
          <Link href="/cargo-request/demo" target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Пример формы <ExternalLink className="size-3.5" /></Link>
          <Button className="h-9 rounded-xl bg-slate-900 px-3.5 text-[13px] text-white" onClick={() => { setSaveError(''); setCreateOpen(true) }}><Plus className="size-4" />Новая</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Поиск заявок" placeholder="Клиент, контейнер, номер…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 rounded-xl pl-9 text-[13px]" /></div>
        <div className="flex flex-wrap gap-1" aria-label="Статус заявки">
          {[['all','Все'], ...Object.entries(CARGO_STATUSES).map(([key,value]) => [key,value.label])].map(([key,label]) => {
            const count = key === 'all' ? requests.length : requests.filter(r => r.status === key).length
            return <button key={key} type="button" aria-pressed={status===key} onClick={() => setStatus(key)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium ${status===key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{label}{count > 0 && <span className={`tabular-nums ${status===key ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>}</button>
          })}
        </div>
      </div>

      {requests.some(r => r.is_demo) && <p className="text-[12px] text-slate-400"><span className="mr-1.5 rounded bg-indigo-50 px-1.5 py-px text-[10px] font-semibold text-indigo-600">Демо</span>— вымышленные примеры. Клиентская форма пока работает в режиме просмотра.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.5fr_1fr_1.3fr_140px_90px] gap-4 border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid"><span>Клиент</span><span>Контейнер</span><span>Маршрут</span><span>Статус</span><span className="text-right">Создана</span></div>
        {loading ? <div className="space-y-2 p-4" role="status" aria-label="Загружаем заявки">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div> : error ? <div className="p-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p><Button variant="outline" className="mt-3" onClick={() => setVersion(v=>v+1)}>Повторить</Button></div> : filtered.length === 0 ? <div className="px-6 py-14 text-center"><ClipboardList className="mx-auto mb-3 size-10 text-slate-200" strokeWidth={1.5} /><p className="text-[14px] font-medium text-slate-500">{requests.length ? 'Заявки не найдены' : 'Здесь будут заявки клиентов'}</p><p className="mt-1 text-[12px] text-slate-400">{requests.length ? 'Измените запрос или выбранный статус.' : 'Создайте первую заявку или откройте пример формы.'}</p></div> : <ul>
          {filtered.map(request => <li key={request.id} className="border-t border-slate-50 first:border-t-0"><button type="button" onClick={() => setSelected(request)} className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-slate-50/60 focus-visible:outline-2 focus-visible:outline-indigo-500 md:grid-cols-[1.5fr_1fr_1.3fr_140px_90px]">
            <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50"><ClipboardList className="size-4 text-indigo-500" /></div>
              <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{request.client_name.replace(/^Демо · /,'')}</p><p className="flex items-center gap-1.5 text-[11px] text-slate-400">№{request.request_number.toString().padStart(4,'0')}{request.is_demo && <span className="rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-600">Демо</span>}</p></div>
            </div>
            <div className="flex items-center gap-1.5"><span className={`font-mono text-[12px] ${request.container_number ? 'font-semibold text-slate-800' : 'text-slate-300'}`}>{request.container_number || '—'}</span><span className={`rounded px-1.5 py-px text-[10px] font-medium ${request.container_size === 20 ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>{request.container_size}ft</span></div>
            <div className="min-w-0"><p className="truncate text-[13px] text-slate-700">{request.origin || '—'} → {request.destination || '—'}</p><p className="text-[11px] text-slate-400">{request.cargo_request_items.length ? `Позиций: ${request.cargo_request_items.length}` : 'Товары не добавлены'}</p></div>
            <div><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${CARGO_STATUSES[request.status].className}`}>{CARGO_STATUSES[request.status].label}</span></div>
            <p className="text-right text-[12px] tabular-nums text-slate-400">{date(request.created_at)}</p>
          </button></li>)}
        </ul>}
      </div>

      <CargoRequestDialog request={selected} onClose={() => setSelected(null)} onChange={r => { setSelected(r); setVersion(v => v + 1) }} />

      {sendFailed && <p role="alert" className="text-sm text-red-600">Заявка сохранена, но отправить её перевозчику в Telegram не удалось.</p>}
      {/* New request window: same shell, cards and controls as the new shipment window on the shipments page. */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-4" onClick={closeCreate}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <form onSubmit={saveDraft} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeCreate() }}
            className="relative mx-3 mb-3 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[24px] backdrop-saturate-200 animate-in slide-in-from-bottom duration-200 md:mx-0 md:mb-0 md:w-[90vw] md:max-w-[880px] md:zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/60 px-5 pb-3 pt-3">
              <p className="font-heading text-[15px] font-bold text-slate-900">Новая заявка</p>
              <button type="button" onClick={closeCreate} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 transition-colors active:bg-white/80"><X className="h-4 w-4 text-slate-500" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <p className={sectionCls}>Клиент</p>
                <div className={`${cardCls} grid grid-cols-1 gap-3 sm:grid-cols-2`}>
                  <label><span className={labelCls}>Имя клиента *</span><input type="text" required autoFocus maxLength={120} className={inpCls} value={draft.client_name} onChange={e => set('client_name', e.target.value)} /></label>
                  <label><span className={labelCls}>Телефон</span><input type="tel" maxLength={40} className={inpCls} value={draft.phone} onChange={e => set('phone', e.target.value)} /></label>
                </div>
              </div>

              <div>
                <p className={sectionCls}>Контейнер</p>
                <div className={`${cardCls} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
                  <div className="sm:col-span-2">
                    <p className={labelCls}>Размер</p>
                    <div className="flex gap-1">{([['20', '20DC'], ['40', '40HQ'], ['45', '45HQ']] as const).map(([v, label]) => pill(label, draft.container_size === v, () => set('container_size', v)))}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className={labelCls}>SOC / COC</p>
                    <div className="flex flex-wrap gap-1">{([['', 'Не указано'], ['SOC', 'SOC — наш'], ['COC', 'COC — перевозчика']] as const).map(([v, label]) => pill(label, draft.container_owner === v, () => set('container_owner', v)))}</div>
                  </div>
                  <label><span className={labelCls}>Номер контейнера</span><input type="text" maxLength={11} placeholder="XXXX0000000" autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${inpCls} font-mono font-semibold tracking-wider placeholder:font-normal placeholder:tracking-normal`} value={draft.container_number} onChange={e => setDraft(d => ({ ...d, container_number: editContainerNumber(e.target.value, d.container_number) }))} /></label>
                  <label><span className={labelCls}>Вес, кг</span><input type="number" min={0} step="any" className={inpCls} value={draft.weight_kg} onChange={e => set('weight_kg', e.target.value)} /></label>
                  <label><span className={labelCls}>Дата загрузки</span><input type="date" className={inpCls} value={draft.loading_date} onChange={e => set('loading_date', e.target.value)} /></label>
                  <label><span className={labelCls}>Поставщик контейнера</span><input type="text" maxLength={120} className={inpCls} value={draft.supplier} onChange={e => set('supplier', e.target.value)} /></label>
                </div>
              </div>

              <div>
                <p className={sectionCls}>Маршрут</p>
                <div className={cardCls}>
                  <div className="relative mb-3 hidden sm:block">
                    <div className={`absolute top-5 h-0.5 ${draft.origin && draft.via ? 'bg-slate-400' : 'bg-slate-200'}`} style={{ left: 'calc(16.67% + 20px)', right: 'calc(50% + 20px)' }} />
                    <div className={`absolute top-5 h-0.5 ${draft.via && draft.destination ? 'bg-slate-400' : 'bg-slate-200'}`} style={{ left: 'calc(50% + 20px)', right: 'calc(16.67% + 20px)' }} />
                    <div className="relative grid grid-cols-3 gap-3">
                      {step(<Ship className="h-4 w-4" />, 'Откуда', draft.origin ? 'bg-slate-800' : '')}
                      {step(<Filter className="h-4 w-4" />, 'Переход', draft.via ? 'bg-slate-600' : '')}
                      {step(<Ship className="h-4 w-4" />, 'Куда', draft.destination ? 'bg-emerald-500' : '')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input type="text" maxLength={160} placeholder="Пункт отправления" aria-label="Откуда" className={inpCls} value={draft.origin} onChange={e => set('origin', e.target.value)} />
                    <SearchableSelect placeholder="Погранпереход" options={VIA_OPTIONS.map(v => ({ value: v, label: v }))} value={draft.via} onChange={v => set('via', v)} />
                    <input type="text" maxLength={160} placeholder="Пункт доставки" aria-label="Куда" className={inpCls} value={draft.destination} onChange={e => set('destination', e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <p className={sectionCls}>Участники</p>
                <div className={cardCls}>
                  <div className="mb-3 hidden grid-cols-3 gap-3 sm:grid">
                    {step(<Send className="h-4 w-4" />, 'Отправитель', draft.sender_id ? 'bg-emerald-500' : '')}
                    {step(<Phone className="h-4 w-4" />, 'Телефон отправителя', draft.shipper_phone ? 'bg-violet-500' : '')}
                    {step(<Truck className="h-4 w-4" />, 'Перевозчик', draft.carrier_id ? 'bg-amber-500' : '')}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <SearchableSelect placeholder="Отправитель (yard)" options={senders.map(s => ({ value: s.id, label: s.name }))} value={draft.sender_id}
                      onChange={v => setDraft(d => ({ ...d, sender_id: v, shipper_phone: senders.find(s => s.id === v)?.phone ?? '' }))} />
                    <input type="tel" maxLength={40} placeholder="Телефон отправителя" aria-label="Телефон отправителя" className={inpCls} value={draft.shipper_phone} onChange={e => set('shipper_phone', e.target.value)} />
                    <SearchableSelect placeholder="Перевозчик" options={carriers.map(c => ({ value: c.id, label: c.name }))} value={draft.carrier_id} onChange={v => set('carrier_id', v)} />
                  </div>
                </div>
              </div>

              {draft.carrier_id && (
                <div>
                  <p className={sectionCls}>Уйдёт в Telegram-группу перевозчика</p>
                  <pre className={`${cardCls} whitespace-pre-wrap break-words font-sans text-[13px] leading-snug text-slate-700`}>{carrierRequestText({ ...draft, container_size: Number(draft.container_size), yard: draftSender?.name })}</pre>
                </div>
              )}
              <p className="px-1 text-[12px] text-slate-500">Ссылка для настоящей отправки клиенту появится на следующем этапе.</p>
              {saveError && <p role="alert" className="px-1 text-[13px] text-red-600">{saveError}</p>}
            </div>

            <div className="flex items-center gap-2 border-t border-white/60 bg-white/20 px-5 pb-3 pt-3">
              <button type="button" onClick={closeCreate} className="h-10 flex-1 rounded-xl border border-white/80 bg-white/60 text-[13px] font-medium text-slate-600 transition-colors active:bg-white/90">Отмена</button>
              <button type="submit" disabled={saving} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 active:bg-indigo-700 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {saving ? 'Сохраняем…' : draft.carrier_id ? 'Сохранить и отправить' : 'Сохранить черновик'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
