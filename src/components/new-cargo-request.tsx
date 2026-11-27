'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { X, Ship, Filter, Send, Phone, Truck, Save, User } from 'lucide-react'
import { ContainerArt, containerTypeColor } from '@/components/container-art'
import { SearchableSelect } from '@/components/searchable-select'
import { createClient } from '@/lib/supabase/client'
import { VIA_OPTIONS, cargoContactError, carrierRequestText } from '@/lib/cargo-requests'

const emptyDraft = { client_id: '', client_name: '', phone: '', container_number: '', origin: '', destination: '', loading_date: '', supplier: '', carrier_id: '', sender_id: '', shipper_phone: '', weight_kg: '', container_size: '40', container_type: 'Выкупной', container_owner: '', via: '', cargo: '' }
const CONTAINER_TYPES = [
  ['Выкупной', 'bg-indigo-500 text-white border-indigo-500'], ['Возвратный', 'bg-amber-500 text-white border-amber-500'], ['Собственный', 'bg-emerald-500 text-white border-emerald-500'],
  ['Малшы', 'bg-violet-500 text-white border-violet-500'], ['Sinorail', 'bg-indigo-500 text-white border-indigo-500'],
] as const
// Classes shared with the new shipment window (shipments/page.tsx).
const inpCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300'
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500'
const sectionCls = 'mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const cardCls = 'rounded-2xl bg-white/60 p-4 ring-1 ring-white/80'
const pill = (label: string, active: boolean, onClick: () => void, activeCls = 'border-slate-900 bg-slate-900 text-white') => (
  <button key={label} type="button" onClick={onClick} aria-pressed={active}
    className={`h-7 rounded-full border px-3 text-[11px] font-medium transition-all ${active ? activeCls : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>{label}</button>
)
// Round icon above a field; `color` is set once the field is filled.
const step = (icon: ReactNode, label: string, color: string) => (
  <div className="flex flex-col items-center">
    <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all ${color ? `${color} text-white shadow-md` : 'bg-white text-slate-400 ring-2 ring-dashed ring-slate-300'}`}>{icon}</div>
    <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
  </div>
)

// "New cargo request" window: same shell, cards and controls as the new shipment window on the shipments page.
// Opened from the cargo requests page and from the shipments toolbar. `onCreated(sendFailed)` fires after the request is saved.
export function NewCargoRequest({ onClose, onCreated }: { onClose: () => void; onCreated: (sendFailed: boolean) => void }) {
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [carriers, setCarriers] = useState<{ id: string; name: string; telegram_chat_id: number | null }[]>([])
  useEffect(() => {
    createClient().from('carriers').select('id, name, telegram_chat_id').order('name')
      .then(({ data }) => setCarriers(data ?? []))
  }, [])
  // Same reference lists as the shipment form (Справочники): cities and cargo.
  const [refs, setRefs] = useState<Record<string, { value: string; label: string; name_en?: string | null; phone?: string | null; maps_url?: string | null }[]>>({})
  useEffect(() => {
    createClient().from('reference_items').select('category, name, name_en, phone, maps_url').order('name').then(({ data }) =>
      setRefs(Object.groupBy((data ?? []).map(r => ({ ...r, category: r.category as string, value: r.name as string, label: r.name as string })), r => r.category) as typeof refs))
  }, [])
  const [clients, setClients] = useState<{ id: string; name: string; phone: string | null }[]>([])
  useEffect(() => {
    createClient().from('clients').select('id, name, phone').order('name').then(({ data }) => setClients(data ?? []))
  }, [])
  const [senders, setSenders] = useState<{ id: string; name: string; phone: string | null }[]>([])
  useEffect(() => {
    createClient().from('senders').select('id, name, phone').order('name').then(({ data }) => setSenders(data ?? []))
  }, [])
  const draftSender = senders.find(s => s.id === draft.sender_id)
  // Справочники hold the sender's English name, phone and map link; matched by name, as the carrier endpoint does.
  const senderRef = (refs.sender ?? []).find(o => o.value === draftSender?.name)
  // The carrier is also the container supplier. One with a Telegram group gets the request posted there by the bot.
  const carrier = carriers.find(c => c.id === draft.carrier_id)
  const willPost = !!carrier?.telegram_chat_id
  const set = (key: keyof typeof emptyDraft, value: string) => setDraft(d => ({ ...d, [key]: value }))
  const closeCreate = () => { if (!saving) onClose() }


  async function saveDraft(event: FormEvent) {
    event.preventDefault()
    const validation = cargoContactError(draft)
    if (validation) { setSaveError(validation); return }
    setSaving(true)
    setSaveError('')
    try {
      const shipper_phone = draft.shipper_phone.trim() || null
      const { cargo, ...fields } = draft
      const { data, error } = await createClient().from('cargo_requests').insert({
        ...fields, container_type: draft.container_type || null, client_id: draft.client_id || null, client_name: draft.client_name.trim(), container_number: draft.container_number || null,
        loading_date: draft.loading_date || null, supplier: carrier?.name ?? null, carrier_id: draft.carrier_id || null,
        sender_id: draft.sender_id || null, shipper_phone, weight_kg: draft.weight_kg ? Number(draft.weight_kg) : null,
        container_size: Number(draft.container_size), container_owner: draft.container_owner || null, via: draft.via || null, status: 'draft',
      }).select('id').single()
      if (error) throw error
      // The request is saved either way; a failed item insert only loses the cargo name.
      if (cargo) await createClient().from('cargo_request_items').insert({ request_id: data.id, name: cargo, quantity: 1 })
      // A phone typed for a client who had none is kept on the client, so next time it is prefilled.
      const client = clients.find(c => c.id === draft.client_id)
      if (client && !client.phone && draft.phone.trim()) await createClient().from('clients').update({ phone: draft.phone.trim() }).eq('id', client.id)
      // The carrier endpoint posts the request to the carrier's Telegram group.
      onCreated(willPost && !(await fetch('/api/cargo-request/carrier', { method: 'POST', body: JSON.stringify({ id: data.id }) })).ok)
    } catch {
      setSaveError('Не удалось сохранить черновик. Данные остались в форме — попробуйте ещё раз.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-4" onClick={closeCreate}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
      <form onSubmit={saveDraft} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeCreate() }}
        className="relative mx-3 mb-3 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[24px] backdrop-saturate-200 animate-in slide-in-from-bottom duration-200 md:mx-0 md:mb-0 md:w-[90vw] md:max-w-[1100px] md:zoom-in-95">
        <div className="flex items-center justify-between border-b border-white/60 px-5 pb-3 pt-3">
          <p className="font-heading text-[15px] font-bold text-slate-900">Новая заявка</p>
          <button type="button" onClick={closeCreate} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 transition-colors active:bg-white/80"><X className="h-4 w-4 text-slate-500" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Container: illustration + size, type and the rest, as in the new shipment window. A request has no container number yet. */}
          <div className="grid grid-cols-1 items-center gap-5 rounded-2xl bg-white/50 p-4 ring-1 ring-white/80 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex min-h-[140px] items-center justify-center"><ContainerArt size={draft.container_size} color={containerTypeColor(draft.container_type)} /></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><p className={labelCls}>Размер</p><div className="flex gap-1">{(['20', '40', '45'] as const).map(v => pill(`${v} ft`, draft.container_size === v, () => set('container_size', v)))}</div></div>
                <div><p className={labelCls} title="SOC — наш контейнер, COC — контейнер перевозчика. Можно не указывать.">Чей контейнер</p><div className="flex gap-1">{(['SOC', 'COC'] as const).map(v => pill(v, draft.container_owner === v, () => set('container_owner', draft.container_owner === v ? '' : v)))}</div></div>
              </div>
              <div><p className={labelCls}>Тип</p><div className="flex flex-wrap gap-1">{CONTAINER_TYPES.map(([v, cls]) => pill(v, draft.container_type === v, () => set('container_type', v), cls))}</div></div>
              <div className="grid grid-cols-2 gap-2">
                <label><span className={labelCls}>Дата загрузки</span><input type="date" className={inpCls} value={draft.loading_date} onChange={e => set('loading_date', e.target.value)} /></label>
                <div><span className={labelCls}>Товар</span><SearchableSelect placeholder="Выберите..." options={refs.cargo ?? []} value={draft.cargo} onChange={v => set('cargo', v)} /></div>
                <label><span className={labelCls}>Вес, кг</span><input type="number" min={0} step="any" className={inpCls} value={draft.weight_kg} onChange={e => set('weight_kg', e.target.value)} /></label>
              </div>
            </div>
          </div>

          <div>
            <p className={sectionCls}>Участники</p>
            <div className={cardCls}>
              <div className="mb-3 hidden grid-cols-4 gap-3 lg:grid">
                {step(<User className="h-4 w-4" />, 'Клиент', draft.client_id ? 'bg-indigo-500' : '')}
                {step(<Phone className="h-4 w-4" />, 'Телефон клиента', draft.phone ? 'bg-violet-500' : '')}
                {step(<Send className="h-4 w-4" />, 'Отправитель', draft.sender_id ? 'bg-emerald-500' : '')}
                {step(<Truck className="h-4 w-4" />, 'Перевозчик', draft.carrier_id ? 'bg-amber-500' : '')}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SearchableSelect placeholder="Клиент *" options={clients.map(c => ({ value: c.id, label: c.name }))} value={draft.client_id}
                  onChange={v => { const c = clients.find(c => c.id === v); setDraft(d => ({ ...d, client_id: v, client_name: c?.name ?? '', phone: c?.phone ?? '' })) }} />
                <input type="tel" maxLength={40} aria-label="Телефон клиента" placeholder={draft.client_id && !draft.phone ? 'Нет телефона — впишите' : 'Телефон клиента'} className={inpCls} value={draft.phone} onChange={e => set('phone', e.target.value)} />
                {/* The sender's phone is not asked here: it goes to the carrier from the sender's record or the reference list. */}
                <SearchableSelect placeholder="Отправитель (yard)" options={senders.map(s => ({ value: s.id, label: s.name }))} value={draft.sender_id}
                  onChange={v => setDraft(d => ({ ...d, sender_id: v, shipper_phone: senders.find(s => s.id === v)?.phone ?? '' }))} />
                <SearchableSelect placeholder="Перевозчик" options={carriers.map(c => ({ value: c.id, label: c.telegram_chat_id ? `${c.name} · Telegram` : c.name }))} value={draft.carrier_id} onChange={v => set('carrier_id', v)} />
              </div>
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
                  {step(<Filter className="h-4 w-4" />, 'Граница', draft.via ? 'bg-slate-600' : '')}
                  {step(<Ship className="h-4 w-4" />, 'Доставка', draft.destination ? 'bg-emerald-500' : '')}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SearchableSelect placeholder="Пункт отправления" options={refs.city ?? []} value={draft.origin} onChange={v => set('origin', v)} />
                <SearchableSelect placeholder="Погранпереход" options={VIA_OPTIONS.map(v => ({ value: v, label: v }))} value={draft.via} onChange={v => set('via', v)} />
                <SearchableSelect placeholder="Пункт доставки" options={refs.city ?? []} value={draft.destination} onChange={v => set('destination', v)} />
              </div>
            </div>
          </div>

          {willPost && (
            <div>
              <p className={sectionCls}>Уйдёт в Telegram-группу перевозчика</p>
              <pre className={`${cardCls} whitespace-pre-wrap break-words font-sans text-[13px] leading-snug text-slate-700`}>{carrierRequestText({ ...draft, container_size: Number(draft.container_size), yard: senderRef?.name_en || draftSender?.name, shipper_phone: draft.shipper_phone || senderRef?.phone, maps_url: senderRef?.maps_url })}</pre>
            </div>
          )}
          <p className="px-1 text-[12px] text-slate-500">Ссылка для настоящей отправки клиенту появится на следующем этапе.</p>
          {saveError && <p role="alert" className="px-1 text-[13px] text-red-600">{saveError}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-white/60 bg-white/20 px-5 pb-3 pt-3">
          <button type="button" onClick={closeCreate} className="h-10 flex-1 rounded-xl border border-white/80 bg-white/60 text-[13px] font-medium text-slate-600 transition-colors active:bg-white/90">Отмена</button>
          <button type="submit" disabled={saving} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 active:bg-indigo-700 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Сохраняем…' : willPost ? 'Сохранить и отправить' : 'Сохранить черновик'}
          </button>
        </div>
      </form>
    </div>
  )
}
