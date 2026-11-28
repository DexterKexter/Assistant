'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ExternalLink, Plus } from 'lucide-react'
import { NewCargoRequest } from '@/components/new-cargo-request'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { CARGO_STATUSES, type CargoRequest } from '@/lib/cargo-requests'
import { CargoRequestDialog } from '@/components/cargo-request-dialog'
import { Button } from '@/components/ui/button'
import { PageHeader, PageAction, PageActionLink } from '@/components/page-header'
import { FilterBar, FilterTabs, SearchInput } from '@/components/filter-bar'

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
  const [sendFailed, setSendFailed] = useState(false)
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

  if (profileLoading) return <p className="p-6 text-sm text-slate-500">Загружаем заявки…</p>
  if (!canManage) return <p className="p-6 text-sm text-slate-600">Заявки доступны менеджерам и администратору.</p>

  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = requests.filter(r => (status === 'all' || r.status === status) && `${r.request_number} ${r.client_name} ${r.container_number ?? ''}`.toLocaleLowerCase('ru').includes(query))

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Заявки на груз">
        <PageActionLink href="/cargo-request/demo" target="_blank" icon={ExternalLink}>Пример формы</PageActionLink>
        <PageAction icon={Plus} onClick={() => setCreateOpen(true)}>Новая заявка</PageAction>
      </PageHeader>

      <FilterBar>
        <FilterTabs label="Статус заявки" value={status} onChange={setStatus}
          options={[{ key: 'all', label: 'Все', count: requests.length }, ...Object.entries(CARGO_STATUSES).map(([key, v]) => ({ key, label: v.label, count: requests.filter(r => r.status === key).length }))]} />
        <SearchInput value={search} onChange={setSearch} placeholder="Клиент, контейнер, номер" />
      </FilterBar>

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
      {createOpen && <NewCargoRequest onClose={() => setCreateOpen(false)} onCreated={failed => { setSendFailed(failed); setCreateOpen(false); setVersion(v => v + 1) }} />}
    </div>
  )
}
