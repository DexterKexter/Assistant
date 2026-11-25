'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCheck, ClipboardList, ExternalLink, Package, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { CARGO_STATUSES, cargoContactError, type CargoRequest } from '@/lib/cargo-requests'
import { editContainerNumber } from '@/lib/container-number'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const emptyDraft = { client_name: '', phone: '', container_number: '', origin: '', destination: '', loading_date: '' }
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU')

export default function CargoRequestsPage() {
  const { hasRole, loading: profileLoading } = useProfile()
  const canManage = hasRole('admin', 'manager')
  const [requests, setRequests] = useState<CargoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<CargoRequest | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!canManage) return
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data, error } = await createClient().from('cargo_requests').select('*, cargo_request_items(*)').order('created_at', { ascending: false }).abortSignal(controller.signal)
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
      const { error } = await createClient().from('cargo_requests').insert({
        ...draft, client_name: draft.client_name.trim(), container_number: draft.container_number || null,
        loading_date: draft.loading_date || null, status: 'draft',
      })
      if (error) throw error
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
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-1 text-xs font-medium text-slate-500">Работа с клиентами</p><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Заявки на груз</h1><p className="mt-2 text-sm text-slate-500">Данные контейнера и состав груза — до создания перевозки.</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cargo-request/demo" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Пример формы <ExternalLink className="size-3.5" /></Link>
          <Button className="h-10 rounded-xl bg-slate-900 px-4 text-white" onClick={() => { setSaveError(''); setCreateOpen(true) }}><Plus className="size-4" />Новая заявка</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{label:'Всего заявок',value:requests.length,icon:ClipboardList},{label:'На проверке',value:requests.filter(r=>r.status==='submitted').length,icon:Package},{label:'Принято',value:requests.filter(r=>r.status==='accepted').length,icon:CheckCheck}].map(item => <div key={item.label} className="rounded-2xl border border-slate-200/80 p-3 sm:p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{item.label}</span><item.icon className="hidden size-4 text-slate-400 sm:block" /></div><p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{loading ? '—' : item.value}</p></div>)}
      </div>

      {requests.some(r => r.is_demo) && <div className="flex items-start gap-3 rounded-xl bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900"><span className="mt-0.5 rounded border border-indigo-200 px-1.5 text-[10px] font-semibold uppercase">Демо</span><p>Заявки с этой отметкой — вымышленные примеры. Клиентская форма пока работает в режиме просмотра.</p></div>}

      <div className="space-y-3">
        <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input aria-label="Поиск заявок" placeholder="Клиент, контейнер или номер заявки" value={search} onChange={e => setSearch(e.target.value)} className="h-10 rounded-xl pl-9" /></div>
        <div className="flex flex-wrap gap-1.5" aria-label="Статус заявки">
          {[['all','Все'], ...Object.entries(CARGO_STATUSES).map(([key,value]) => [key,value.label])].map(([key,label]) => <button key={key} type="button" aria-pressed={status===key} onClick={() => setStatus(key)} className={`min-h-10 rounded-lg px-3 text-xs font-medium ${status===key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_1fr_24px] gap-4 border-b border-slate-200/80 bg-slate-50 px-5 py-3 text-xs text-slate-500 md:grid"><span>Заявка / клиент</span><span>Контейнер</span><span>Маршрут / товары</span><span>Статус</span><span /></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500" role="status">Загружаем заявки…</p> : error ? <div className="p-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p><Button variant="outline" className="mt-3" onClick={() => setVersion(v=>v+1)}>Повторить</Button></div> : filtered.length === 0 ? <div className="px-6 py-14 text-center"><ClipboardList className="mx-auto mb-3 size-7 text-slate-300" /><p className="font-medium text-slate-800">{requests.length ? 'Заявки не найдены' : 'Здесь будут заявки клиентов'}</p><p className="mt-1 text-sm text-slate-500">{requests.length ? 'Измените запрос или выбранный статус.' : 'Создайте первую заявку или откройте пример формы.'}</p></div> : <ul className="divide-y divide-slate-100">
          {filtered.map(request => <li key={request.id}><button type="button" onClick={() => setSelected(request)} className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-3 px-4 py-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500 md:grid-cols-[1.4fr_1fr_1.2fr_1fr_24px] md:px-5">
            <div className="col-span-2 min-w-0 md:col-span-1"><div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500"><span>Заявка №{request.request_number.toString().padStart(4,'0')}</span>{request.is_demo && <span className="rounded bg-indigo-50 px-1.5 text-indigo-600">Демо</span>}<span className="md:hidden">{date(request.created_at)}</span></div><p className="truncate text-sm font-medium text-slate-900">{request.client_name.replace(/^Демо · /,'')}</p></div>
            <div><p className="font-mono text-xs font-medium text-slate-700">{request.container_number || 'Номер не указан'}</p><p className="mt-1 text-xs text-slate-500">{request.container_size} ft</p></div>
            <div className="min-w-0"><p className="truncate text-xs text-slate-700">{request.origin || 'Откуда'} → {request.destination || 'Куда'}</p><p className="mt-1 text-xs text-slate-500">Позиций: {request.cargo_request_items.length}</p></div>
            <div className="col-span-2 md:col-span-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${CARGO_STATUSES[request.status].className}`}>{CARGO_STATUSES[request.status].label}</span><p className="mt-1.5 hidden text-[11px] text-slate-400 md:block">{date(request.created_at)}</p></div><ArrowRight className="hidden size-4 text-slate-400 md:block" />
          </button></li>)}
        </ul>}
      </div>

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          {selected && <><DialogHeader><DialogTitle>Заявка №{selected.request_number.toString().padStart(4,'0')}</DialogTitle><DialogDescription>{selected.client_name} · {CARGO_STATUSES[selected.status].label}</DialogDescription></DialogHeader>
            {selected.is_demo && <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">Демонстрационная заявка. Все сведения вымышлены.</p>}
            <dl className="grid grid-cols-2 gap-4 text-sm">{[['Контейнер',`${selected.container_number || 'Не указан'} · ${selected.container_size} ft`],['Телефон',selected.phone || 'Не указан'],['Маршрут',`${selected.origin || '—'} → ${selected.destination || '—'}`],['Дата загрузки',selected.loading_date ? date(selected.loading_date) : 'Не указана']].map(([label,value])=><div key={label}><dt className="mb-1 text-xs text-slate-500">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl>
            <div className="space-y-2"><h2 className="mt-2 text-sm font-semibold">Состав груза</h2>{selected.cargo_request_items.length ? [...selected.cargo_request_items].sort((a,b)=>a.position-b.position).map(item=><div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><p className="font-medium">{item.name}</p><span className="shrink-0 text-slate-600">{item.quantity} {item.unit}</span></div><p className="mt-1 text-xs text-slate-500">{[`Мест: ${item.packages ?? '—'}`,`Вес: ${item.weight_kg ?? '—'} кг`,`Объём: ${item.volume_m3 ?? '—'} м³`].join(' · ')}</p>{item.notes && <p className="mt-2 text-xs">{item.notes}</p>}</div>) : <p className="text-sm text-slate-500">Клиент ещё не добавил товары.</p>}</div>
            {selected.notes && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected.notes}</p>}
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={open => { if (!saving) setCreateOpen(open) }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Новая заявка на груз</DialogTitle><DialogDescription>Сохраните черновик. Для начала достаточно имени клиента.</DialogDescription></DialogHeader>
          <form onSubmit={saveDraft} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([['client_name','Имя клиента *','text',120],['phone','Телефон','tel',40],['container_number','Номер контейнера','text',11],['loading_date','Дата загрузки','date',undefined],['origin','Откуда','text',160],['destination','Куда','text',160]] as const).map(([key,label,type,maxLength]) => <label key={key} className="space-y-1.5 text-xs text-slate-600"><span>{label}</span><Input type={type} className="h-11 bg-white" required={key==='client_name'} maxLength={maxLength} value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:key==='container_number' ? editContainerNumber(e.target.value,d.container_number) : e.target.value}))} /></label>)}
            </div>
            <p className="text-xs text-slate-500">Ссылка для настоящей отправки клиенту появится на следующем этапе.</p>
            {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
            <Button type="submit" disabled={saving} className="h-11 w-full bg-slate-900 text-white">{saving ? 'Сохраняем…' : 'Сохранить черновик'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
