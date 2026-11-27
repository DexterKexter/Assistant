'use client'

import { use, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ClipboardList, ExternalLink, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { CARGO_STATUSES, VIA_OPTIONS, cargoContactError, carrierRequestText, type CargoRequest } from '@/lib/cargo-requests'
import { editContainerNumber } from '@/lib/container-number'
import { Input } from '@/components/ui/input'
import { CargoRequestDialog } from '@/components/cargo-request-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const emptyDraft = { client_name: '', phone: '', container_number: '', origin: '', destination: '', loading_date: '', supplier: '', carrier_id: '', sender_id: '', shipper_phone: '', weight_kg: '', container_size: '40', container_owner: '', via: '' }
const selectClass = 'h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900'
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
      <Dialog open={createOpen} onOpenChange={open => { if (!saving) setCreateOpen(open) }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Новая заявка на груз</DialogTitle><DialogDescription>Сохраните черновик. Для начала достаточно имени клиента.</DialogDescription></DialogHeader>
          <form onSubmit={saveDraft} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([['client_name','Имя клиента *','text',120],['phone','Телефон','tel',40],['container_number','Номер контейнера','text',11],['loading_date','Дата загрузки','date',undefined],['origin','Откуда','text',160],['destination','Куда','text',160],['supplier','Поставщик контейнера','text',120]] as const).map(([key,label,type,maxLength]) => <label key={key} className="space-y-1.5 text-xs text-slate-600"><span>{label}</span><Input type={type} className="h-11 bg-white" required={key==='client_name'} maxLength={maxLength} value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:key==='container_number' ? editContainerNumber(e.target.value,d.container_number) : e.target.value}))} /></label>)}
              <label className="space-y-1.5 text-xs text-slate-600"><span>📦 Контейнер</span>
                <select className={selectClass} value={draft.container_size} onChange={e=>setDraft(d=>({...d,container_size:e.target.value}))}><option value="40">40HQ</option><option value="20">20DC</option></select></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>🏷 SOC / COC</span>
                <select className={selectClass} value={draft.container_owner} onChange={e=>setDraft(d=>({...d,container_owner:e.target.value}))}><option value="">Не указано</option><option value="SOC">SOC — наш контейнер</option><option value="COC">COC — контейнер перевозчика</option></select></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>⚖️ Вес, кг</span>
                <Input type="number" min={0} step="any" className="h-11 bg-white" value={draft.weight_kg} onChange={e=>setDraft(d=>({...d,weight_kg:e.target.value}))} /></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>🛣 Переход (via)</span>
                <select className={selectClass} value={draft.via} onChange={e=>setDraft(d=>({...d,via:e.target.value}))}><option value="">Не указан</option>{VIA_OPTIONS.map(v=><option key={v}>{v}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>📍 Отправитель (yard)</span>
                <select className={selectClass} value={draft.sender_id} onChange={e=>setDraft(d=>({...d,sender_id:e.target.value,shipper_phone:senders.find(s=>s.id===e.target.value)?.phone ?? ''}))}><option value="">Не выбран</option>{senders.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>📞 Телефон отправителя</span>
                <Input type="tel" maxLength={40} className="h-11 bg-white" value={draft.shipper_phone} onChange={e=>setDraft(d=>({...d,shipper_phone:e.target.value}))} /></label>
              <label className="space-y-1.5 text-xs text-slate-600"><span>🚛 Перевозчик</span>
                <select className={selectClass} value={draft.carrier_id} onChange={e=>setDraft(d=>({...d,carrier_id:e.target.value}))}>
                  <option value="">Не выбран</option>{carriers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
            </div>
            <p className="text-xs text-slate-500">Ссылка для настоящей отправки клиенту появится на следующем этапе.</p>
            {draft.carrier_id && <div className="space-y-1.5"><p className="text-xs text-slate-500">После сохранения бот отправит в Telegram-группу перевозчика:</p><pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm text-slate-800">{carrierRequestText({ ...draft, container_size: Number(draft.container_size), yard: draftSender?.name })}</pre></div>}
            {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
            <Button type="submit" disabled={saving} className="h-11 w-full bg-slate-900 text-white">{saving ? 'Сохраняем…' : 'Сохранить черновик'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
