'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CARGO_STATUSES, type CargoRequest } from '@/lib/cargo-requests'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const date = (value: string) => new Date(value).toLocaleDateString('ru-RU')

// Request details, shared by the cargo requests list and the pipeline board.
export function CargoRequestDialog({ request: selected, onClose, onChange }: { request: CargoRequest | null; onClose: () => void; onChange: (r: CargoRequest) => void }) {
  const [error, setError] = useState('')
  return (
    <Dialog open={!!selected} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        {selected && <><DialogHeader><DialogTitle>Заявка №{selected.request_number.toString().padStart(4,'0')}</DialogTitle><DialogDescription>{selected.client_name} · {CARGO_STATUSES[selected.status].label}</DialogDescription></DialogHeader>
          {selected.is_demo && <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">Демонстрационная заявка. Все сведения вымышлены.</p>}
          <dl className="grid grid-cols-2 gap-4 text-sm">{[['Контейнер',`${selected.container_number || 'Не указан'} · ${selected.container_size} ft`],['Телефон',selected.phone || 'Не указан'],['Маршрут',`${selected.origin || '—'} → ${selected.destination || '—'}`],['Дата загрузки',selected.loading_date ? date(selected.loading_date) : 'Не указана']].map(([label,value])=><div key={label}><dt className="mb-1 text-xs text-slate-500">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl>
          {/* Uncontrolled + save on blur: the supplier is usually known only after the request arrives. */}
          <label className="block space-y-1.5 text-xs text-slate-500"><span>Поставщик контейнера</span>
            <Input key={selected.id} className="h-10 bg-white text-sm text-slate-900" maxLength={120} defaultValue={selected.supplier ?? ''} placeholder="Не указан"
              onBlur={async e => {
                const supplier = e.target.value.trim() || null
                if (supplier === (selected.supplier ?? null)) return
                const { error } = await createClient().from('cargo_requests').update({ supplier }).eq('id', selected.id)
                if (error) setError('Не удалось сохранить поставщика.')
                else { setError(''); onChange({ ...selected, supplier }) }
              }} /></label>
          {selected.carrier_message_id && <p className="text-xs text-emerald-700">Заявка отправлена в Telegram-группу перевозчика.</p>}
          {!!selected.cargo_request_replies?.length && <div className="space-y-2"><h2 className="mt-2 text-sm font-semibold">Ответы перевозчика</h2>{[...selected.cargo_request_replies].sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(reply=><div key={reply.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="mb-1 text-xs text-slate-500">{reply.author} · {new Date(reply.created_at).toLocaleString('ru-RU')}</p><p className="whitespace-pre-wrap">{reply.text}</p></div>)}</div>}
          <div className="space-y-2"><h2 className="mt-2 text-sm font-semibold">Состав груза</h2>{selected.cargo_request_items.length ? [...selected.cargo_request_items].sort((a,b)=>a.position-b.position).map(item=><div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><p className="font-medium">{item.name}</p><span className="shrink-0 text-slate-600">{item.quantity} {item.unit}</span></div><p className="mt-1 text-xs text-slate-500">{[`Мест: ${item.packages ?? '—'}`,`Вес: ${item.weight_kg ?? '—'} кг`,`Объём: ${item.volume_m3 ?? '—'} м³`].join(' · ')}</p>{item.notes && <p className="mt-2 text-xs">{item.notes}</p>}</div>) : <p className="text-sm text-slate-500">Клиент ещё не добавил товары.</p>}</div>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            {selected.notes && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{selected.notes}</p>}
        </>}
      </DialogContent>
    </Dialog>
  )
}
