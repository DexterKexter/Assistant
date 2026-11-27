'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHAT_CATEGORIES, type ChatCategory } from '@/lib/chat-category'
import { createClient } from '@/lib/supabase/client'
import { cn, fmtDate } from '@/lib/utils'
import { shipmentStatusText, shipmentStatusLabel } from '@/lib/shipment-status'
import { templateValues } from '@/lib/template-values'
import { TEMPLATES, TEMPLATE_FIELDS, compileTemplate, fillTemplate } from '@/lib/whatsapp-template'
import { clientHabits, type Habit } from '@/lib/client-habits'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/searchable-select'
import { WaText } from '@/components/wa-text'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Send, UserPlus, ExternalLink, PanelRight, X, Download, Sparkles, Ship, ClipboardList, User, Unlink } from 'lucide-react'

export type CrmChat = {
  id: string; channel: 'whatsapp'; name: string; username: string | null; phone: string | null
  client_id: string | null; last_message_text: string | null; last_message_at: string; unread_count: number
  ai_category: ChatCategory | null; ai_summary: string | null
}
type Msg = { id: string; chat_id: string; direction: 'in' | 'out'; text: string; created_at: string; pending?: boolean; media_path?: string | null; media_type?: string | null }
export type CrmClient = { id: string; name: string; is_russia: boolean }
type ShipmentRow = Parameters<typeof shipmentStatusText>[0] & { id: string }

const supabase = createClient()
export const chatTime = (d: string) => new Date(d).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })

// The bucket is private: staff get a short-lived signed link.
function Media({ path, type }: { path: string; type: string }) {
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => { supabase.storage.from('crm-media').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl || '')) }, [path])
  if (!url) return <span className="block h-36 w-48 rounded-xl bg-slate-100" />
  if (type.startsWith('image/')) return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Открыть фото" className="-mx-1.5 mb-1 mt-0.5 block cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Фото от клиента" className="block max-h-52 max-w-[220px] object-cover rounded-xl" />
      </button>
      {/* ponytail: single-photo viewer; add prev/next + zoom if chats get photo-heavy */}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Просмотр фото" onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-6 animate-in fade-in duration-150">
          <div className="absolute right-4 top-4 flex gap-2" onClick={e => e.stopPropagation()}>
            <a href={url} download target="_blank" rel="noreferrer" aria-label="Скачать" title="Скачать" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><Download className="h-4 w-4" /></a>
            <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Закрыть" title="Закрыть (Esc)" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Фото от клиента" onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        </div>,
        document.body
      )}
    </>
  )
  if (type.startsWith('video/')) return <video src={url} controls className="-mx-1.5 mb-1 mt-0.5 block max-h-52 max-w-[220px] object-cover rounded-xl" />
  if (type.startsWith('audio/')) return <audio src={url} controls className="mb-1 block" />
  return <a href={url} target="_blank" rel="noreferrer" className="mb-1 block underline">Открыть файл</a>
}

// side=false renders only the conversation (used inside a client's page).
export function CrmThread({ chat, clients, onBack, side = true, onClientCreated }: { chat: CrmChat; clients: CrmClient[]; onBack?: () => void; side?: boolean; onClientCreated?: (c: CrmClient) => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const [openedAt] = useState(() => Date.now())
  const [panel, setPanel] = useState(false)
  const client = clients.find(c => c.id === chat.client_id)

  useEffect(() => {
    supabase.from('crm_messages').select('*').eq('chat_id', chat.id).order('created_at').then(({ data }) => setMessages(data || []))
    const ch = supabase.channel(`crm-msg-${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `chat_id=eq.${chat.id}` },
        p => setMessages(m => {
          if (m.some(x => x.id === p.new.id)) return m
          // The realtime copy of a message we are still sending replaces its optimistic bubble.
          const i = p.new.direction === 'out' ? m.findIndex(x => x.pending && x.text === p.new.text) : -1
          return i < 0 ? [...m, p.new as Msg] : m.with(i, p.new as Msg)
        }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [chat.id])

  // Scroll only the message list: scrollIntoView would also scroll the host page.
  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight }, [messages])

  useEffect(() => {
    if (!chat.client_id) return
    supabase.from('shipments')
      .select('id, container_number, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, is_completed')
      .eq('client_id', chat.client_id).order('departure_date', { ascending: false, nullsFirst: true }).limit(20)
      .then(({ data }) => setShipments(data || []))
  }, [chat.client_id])

  // WhatsApp only delivers free-form text within 24h of the client's last message.
  const lastIn = messages.findLast(m => m.direction === 'in')
  const windowClosed = messages.length > 0 &&
    (!lastIn || openedAt - new Date(lastIn.created_at).getTime() > 24 * 3600 * 1000)

  // Outside the 24h window only an approved template goes through; the CRM fills its fields itself.
  const [tplName, setTplName] = useState('')
  const [tplShipment, setTplShipment] = useState('')
  const picked = TEMPLATES.find(t => t.name === tplName)
  const tpl = picked && compileTemplate(picked.text)
  const tplNeedsShipment = !!tpl?.fields.some(f => TEMPLATE_FIELDS[f]?.needsShipment)
  const tplShip = shipments.find(s => s.id === tplShipment)
  const tplValues = templateValues(client?.name || chat.name, tplShip, !!client?.is_russia, openedAt)
  const tplPreview = tpl && fillTemplate(tpl.body, tpl.fields.map(f => tplValues[f] || ''))

  // Optimistic: the bubble appears and the input clears at once; the server call finishes in the background.
  async function send(body: string, shipmentId?: string, template?: string) {
    const shown = template ? tplPreview || '' : body.trim()
    if (!shown) return
    const typed = !shipmentId && !template
    const tempId = `tmp-${crypto.randomUUID()}`
    setMessages(m => [...m, { id: tempId, chat_id: chat.id, direction: 'out', text: shown, created_at: new Date().toISOString(), pending: true }])
    if (typed) setText('')
    setSending(true); setError('')

    const res = await fetch('/api/crm/send', { method: 'POST', body: JSON.stringify({ chatId: chat.id, text: body, shipmentId, template }) })
      .catch(() => new Response('Нет связи с сервером', { status: 503 }))
    setSending(false)
    if (!res.ok) {
      setError(await res.text())
      setMessages(m => m.filter(x => x.id !== tempId))
      if (typed) setText(t => t || body)   // give the text back unless the user already typed something new
      return
    }
    const msg: Msg = await res.json()
    setMessages(m => {
      const rest = m.filter(x => x.id !== tempId)
      return rest.some(x => x.id === msg.id) ? rest : [...rest, msg]
    })
  }

  // Messages grouped by calendar day, so the date is shown once instead of on every bubble.
  const dayLabel = (iso: string) => {
    const d = new Date(iso), key = d.toDateString()
    if (key === new Date(openedAt).toDateString()) return 'Сегодня'
    if (key === new Date(openedAt - 86400000).toDateString()) return 'Вчера'
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', ...(d.getFullYear() !== new Date(openedAt).getFullYear() && { year: 'numeric' }) })
  }
  const title = client?.name || chat.name || chat.phone || 'Без имени'

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#f1f3f6] min-w-0">
        <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-slate-200/70 bg-white">
          {onBack && <button onClick={onBack} className="md:hidden -ml-1 p-1" aria-label="Назад"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>}
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600 shrink-0">{title.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate leading-tight">{title}</p>
            {chat.phone && <p className="text-[12px] text-slate-400 truncate leading-tight">{chat.phone}</p>}
          </div>
          {chat.ai_category && <span title={chat.ai_summary || undefined} className={cn('hidden shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:inline', CHAT_CATEGORIES[chat.ai_category].className)}>{CHAT_CATEGORIES[chat.ai_category].label}</span>}
          {side && <button onClick={() => setPanel(v => !v)} aria-label="Клиент и перевозки" title="Клиент и перевозки" aria-pressed={panel}
            className={`ml-auto w-8 h-8 shrink-0 rounded-lg flex items-center justify-center hover:bg-slate-100 ${panel ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}>
            <PanelRight className="w-4 h-4" />
          </button>}
        </div>

        <div ref={list} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
            const out = m.direction === 'out'
            return (
              <div key={m.id}>
                {newDay && <p className="my-3 text-center"><span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">{dayLabel(m.created_at)}</span></p>}
                <div className={cn('flex', out ? 'justify-end' : 'justify-start', !newDay && prev.direction === m.direction ? 'mt-0.5' : 'mt-2.5')}>
                  <div className={cn('max-w-[72%] rounded-[18px] px-3 py-1.5 text-[13.5px] leading-snug', m.pending && 'opacity-50',
                    out ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.06)]')}>
                    {m.media_path && <Media path={m.media_path} type={m.media_type || ''} />}
                    <WaText text={m.media_path ? m.text.replace(/^\[(фото|видео|голосовое)\]\s*/, '') : m.text} />
                    <span className={cn('ml-2 inline-block translate-y-0.5 text-[10px] tabular-nums', out ? 'text-white/50' : 'text-slate-400')}>
                      {m.pending ? '…' : chatTime(m.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {error && <p role="alert" className="mx-3 mb-1 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] text-red-600">Не отправлено: {error}</p>}
        {side && <ChatRequests key={chat.id} chat={chat} clientName={client?.name || chat.name} />}
        {windowClosed ? (
          <div className="m-3 mt-1 rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
            <p className="text-[12px] text-slate-500">Клиент не писал больше 24 часов — WhatsApp пропустит только шаблон.</p>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Шаблон" value={tplName} onChange={e => setTplName(e.target.value)}
                className="flex-1 min-w-[140px] h-9 rounded-lg bg-slate-100 px-2.5 text-[13px] outline-none">
                <option value="">Выберите шаблон…</option>
                {TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.title}</option>)}
              </select>
              {tplNeedsShipment && (
                <select aria-label="Контейнер" value={tplShipment} onChange={e => setTplShipment(e.target.value)}
                  className="flex-1 min-w-[140px] h-9 rounded-lg bg-slate-100 px-2.5 text-[13px] outline-none">
                  <option value="">{shipments.length ? 'Выберите контейнер…' : 'У клиента нет перевозок'}</option>
                  {shipments.map(s => <option key={s.id} value={s.id}>{s.container_number || 'без номера'} · {[s.origin, s.destination_city].filter(Boolean).join(' → ')}</option>)}
                </select>
              )}
            </div>
            {tplPreview && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] leading-snug text-slate-700"><WaText text={tplPreview} /></p>}
            <button onClick={() => send('', tplShipment || undefined, tplName)} disabled={sending || !tpl || (tplNeedsShipment && !tplShipment)}
              className="w-full h-9 rounded-lg bg-slate-900 text-white text-[13px] font-medium disabled:bg-slate-200">
              Отправить шаблон
            </button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); send(text) }}
            className="m-3 mt-1 flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-3.5 shadow-sm focus-within:border-slate-400 transition-colors">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Сообщение" aria-label="Сообщение клиенту"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }}
              className="flex-1 resize-none bg-transparent py-1.5 text-[13.5px] outline-none placeholder:text-slate-400 max-h-32" />
            <button disabled={!text.trim()} aria-label="Отправить"
              className="w-8 h-8 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:bg-slate-200 transition-colors">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {side && panel && <aside className="absolute inset-y-0 right-0 z-10 shadow-xl lg:static lg:shadow-none flex flex-col gap-2 p-2 w-[288px] shrink-0 bg-slate-900 overflow-y-auto animate-in slide-in-from-right duration-200">
        {chat.ai_category && (
          <div className={P.card}>
            <p className={cn(P.title, 'mb-1.5')}><Sparkles className={P.icon} aria-hidden="true" />ИИ · {CHAT_CATEGORIES[chat.ai_category].label}</p>
            {chat.ai_summary && <p className="text-[13px] leading-snug text-slate-200">{chat.ai_summary}</p>}
          </div>
        )}
        <ClientLink chat={chat} clients={clients} client={client} onClientCreated={onClientCreated} />
        <div className={cn(P.card, 'space-y-1.5')}>
          <p className={P.title}><Ship className={P.icon} aria-hidden="true" />Перевозки{chat.client_id && shipments.length > 0 ? ` · ${shipments.length}` : ''}</p>
          {!chat.client_id && <p className={P.muted}>Появятся после привязки клиента.</p>}
          {chat.client_id && shipments.length === 0 && <p className={P.muted}>Перевозок пока нет.</p>}
          {chat.client_id && shipments.map(s => (
            <div key={s.id} className={cn(P.row, 'group flex items-center gap-2 pr-1')}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px] font-semibold text-white">{s.container_number || 'без номера'}</p>
                <p className="truncate text-[11px] text-slate-400">{shipmentStatusLabel(s, !!client?.is_russia)}</p>
              </div>
              <button onClick={() => send(shipmentStatusText(s, !!client?.is_russia), s.id)} disabled={sending || windowClosed}
                title={windowClosed ? 'Клиент не писал больше 24 часов — отправьте шаблон' : 'Отправить статус клиенту'} aria-label={`Отправить статус ${s.container_number || ''}`}
                className="size-7 shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-30">
                <Send className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>}
    </>
  )
}

// Kazakhstan mobile/landline numbers are +7 6xx / +7 7xx; the rest of +7 is Russia.
const looksRussian = (phone: string | null) => {
  const d = (phone || '').replace(/\D/g, '')
  return d.length === 11 && d[0] === '7' && d[1] !== '7' && d[1] !== '6'
}

// Dark side panel: one radius for cards (2xl), one for controls (lg, 36px high), monochrome — white is the only accent.
const P = {
  card: 'rounded-2xl bg-white/[0.05] p-3',
  title: 'flex items-center gap-1.5 text-[12px] font-medium text-slate-400',
  icon: 'size-3.5 text-slate-500',
  row: 'rounded-lg bg-white/[0.06] px-2.5 py-1.5 hover:bg-white/[0.1] transition-colors',
  input: 'w-full h-9 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-white/40 [color-scheme:dark]',
  primary: 'h-9 rounded-lg bg-white px-3 text-[13px] font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition-colors',
  ghost: 'h-9 rounded-lg px-3 text-[13px] text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors',
  segment: 'flex gap-0.5 rounded-lg bg-white/[0.06] p-0.5',
  segmentOn: 'bg-white text-slate-900',
  segmentOff: 'text-slate-400 hover:text-white',
  muted: 'text-[12px] text-slate-500',
}

const emptyRequest = { origin: '', destination: '', container_size: 40, container_type: '', loading_date: '', cargo: '', sender: '', supplier: '' }
// Same list as the shipment form.
const CONTAINER_TYPES = ['Выкупной', 'Возвратный', 'Собственный', 'Малшы', 'Арендованный', 'Sinorail']
type ChatRequest = { id: string; request_number: number; origin: string; destination: string; container_size: number; loading_date: string | null }

// Button above the composer: create a cargo request from this chat. Contact details come from the chat, the manager adds the route.
function ChatRequests({ chat, clientName }: { chat: CrmChat; clientName: string }) {
  const [requests, setRequests] = useState<ChatRequest[]>([])
  const [draft, setDraft] = useState<typeof emptyRequest | null>(null) // null = dialog closed
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fields = 'id, request_number, origin, destination, container_size, loading_date'

  useEffect(() => {
    supabase.from('cargo_requests').select(fields).eq('chat_id', chat.id).order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data || []))
  }, [chat.id])

  // Dropdown options come from the reference lists (Админка → Справочники), same as the shipment form.
  const [refs, setRefs] = useState<Record<string, { value: string; label: string }[]>>({})
  useEffect(() => {
    // Container suppliers are the carriers; they live in their own table, not in the reference lists.
    Promise.all([
      supabase.from('reference_items').select('category, name').order('name'),
      supabase.from('carriers').select('name').order('name'),
    ]).then(([items, carriers]) => setRefs(Object.groupBy([
      ...(items.data || []).map(r => ({ category: r.category as string, value: r.name as string, label: r.name as string })),
      ...(carriers.data || []).map(c => ({ category: 'supplier', value: c.name as string, label: c.name as string })),
    ], r => r.category) as typeof refs))
  }, [])

  // What this client usually ships, as one-click presets.
  const [habits, setHabits] = useState<Habit[]>([])
  useEffect(() => {
    if (!chat.client_id) return
    // ponytail: the client's last 500 shipments, counted in the browser; move to SQL if clients outgrow that.
    supabase.from('shipments').select('origin, destination_city, container_size, container_type, cargo_description, sender_name')
      .eq('client_id', chat.client_id).order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => setHabits(clientHabits(data || [])))
  }, [chat.client_id])
  // Shipments hold free text; a value missing from the reference list is left for the manager to pick.
  const known = (list: string, v: string) => (refs[list] || []).some(o => o.value === v) ? v : ''
  const applyHabit = (h: Habit) => setDraft({
    ...emptyRequest, origin: known('city', h.origin), destination: known('city', h.destination),
    container_size: h.size === 20 || h.size === 45 ? h.size : 40, container_type: CONTAINER_TYPES.includes(h.type) ? h.type : '',
    cargo: known('cargo', h.cargo), sender: known('sender', h.sender), supplier: draft?.supplier || '',
  })

  const create = async () => {
    if (!draft || !draft.origin || !draft.destination) { setError('Укажите, откуда и куда.'); return }
    setSaving(true); setError('')
    const { data, error } = await supabase.from('cargo_requests').insert({
      client_name: (clientName || chat.phone || 'Без имени').slice(0, 120), phone: chat.phone || '', client_id: chat.client_id, chat_id: chat.id, source: 'whatsapp',
      origin: draft.origin, destination: draft.destination, container_size: draft.container_size, container_type: draft.container_type || null,
      loading_date: draft.loading_date || null, sender_name: draft.sender || null, supplier: draft.supplier || null,
    }).select(fields).single()
    if (error || !data) { setError(error?.message || 'Не удалось создать заявку'); setSaving(false); return }
    // The request itself is saved; a failed item insert only loses the cargo name.
    if (draft.cargo) await supabase.from('cargo_request_items').insert({ request_id: data.id, name: draft.cargo, quantity: 1 })
    setRequests(r => [data, ...r]); setDraft(null); setSaving(false)
  }

  const section = 'mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'
  return (
    <div className="mx-3 mt-1 flex">
      <button onClick={() => setDraft(emptyRequest)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:border-slate-300">
        <ClipboardList className="size-3.5 text-slate-400" aria-hidden="true" />Заявка
        {requests.length > 0 && <span className="rounded bg-slate-100 px-1 text-[11px] tabular-nums text-slate-500">{requests.length}</span>}
      </button>

      <Dialog open={!!draft} onOpenChange={open => { if (!open && !saving) { setDraft(null); setError('') } }}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
          <DialogHeader className="flex-row items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><ClipboardList className="size-4 text-slate-600" aria-hidden="true" /></div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-[15px] font-semibold text-slate-900">Новая заявка</DialogTitle>
              <DialogDescription className="truncate text-[12px] text-slate-500">{clientName || chat.phone}{chat.phone && clientName ? ` · ${chat.phone}` : ''}</DialogDescription>
            </div>
          </DialogHeader>
          {draft && (
            <form onSubmit={e => { e.preventDefault(); create() }}>
              <div className="space-y-5 px-5 py-4">
                {chat.client_id && habits.length > 0 && (
                  <div>
                    <p className={section}>Обычно возит</p>
                    <div className="flex flex-wrap gap-1.5">
                      {habits.map(h => (
                        <button key={`${h.origin}-${h.destination}`} type="button" onClick={() => applyHabit(h)} title={[h.size && `${h.size} ft`, h.cargo, h.sender].filter(Boolean).join(' · ')}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                          {h.origin} <ArrowRight className="size-3 text-slate-400" aria-hidden="true" /> {h.destination}
                          <span className="tabular-nums text-slate-400">{h.count}×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className={section}>Маршрут</p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <SearchableSelect placeholder="Откуда" options={refs.city || []} value={draft.origin} onChange={v => setDraft({ ...draft, origin: v })} />
                    <ArrowRight className="size-4 text-slate-300" aria-hidden="true" />
                    <SearchableSelect placeholder="Куда" options={refs.city || []} value={draft.destination} onChange={v => setDraft({ ...draft, destination: v })} />
                  </div>
                </div>
                <div>
                  <p className={section}>Контейнер</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex h-9 gap-0.5 rounded-lg bg-slate-100 p-0.5">
                      {[20, 40, 45].map(size => (
                        <button key={size} type="button" onClick={() => setDraft({ ...draft, container_size: size })} aria-pressed={draft.container_size === size}
                          className={cn('flex-1 rounded-md text-[13px] font-medium', draft.container_size === size ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                          {size} ft
                        </button>
                      ))}
                    </div>
                    <SearchableSelect placeholder="Тип контейнера" options={CONTAINER_TYPES.map(t => ({ value: t, label: t }))} value={draft.container_type} onChange={v => setDraft({ ...draft, container_type: v })} />
                    <SearchableSelect placeholder="Поставщик контейнера" options={refs.supplier || []} value={draft.supplier} onChange={v => setDraft({ ...draft, supplier: v })} />
                    <label className="relative block">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">Загрузка</span>
                      <input type="date" aria-label="Дата загрузки" value={draft.loading_date} onChange={e => setDraft({ ...draft, loading_date: e.target.value })}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-[78px] pr-2.5 text-[13px] text-slate-800 outline-none hover:border-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
                    </label>
                  </div>
                </div>
                <div>
                  <p className={section}>Груз</p>
                  <div className="grid grid-cols-2 gap-2">
                    <SearchableSelect placeholder="Товар" options={refs.cargo || []} value={draft.cargo} onChange={v => setDraft({ ...draft, cargo: v })} />
                    <SearchableSelect placeholder="Отправитель" options={refs.sender || []} value={draft.sender} onChange={v => setDraft({ ...draft, sender: v })} />
                  </div>
                </div>
                {requests.length > 0 && (
                  <div>
                    <p className={section}>Уже созданы из этого чата</p>
                    {requests.map(r => (
                      <Link key={r.id} href="/dashboard/pipeline" className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-slate-50">
                        <span className="tabular-nums text-slate-400">№{String(r.request_number).padStart(4, '0')}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.origin} → {r.destination}</span>
                        <span className="shrink-0 text-[12px] text-slate-400">{r.container_size} ft{r.loading_date ? ` · ${fmtDate(r.loading_date)}` : ''}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
                {error && <p className="min-w-0 flex-1 truncate text-[12px] text-red-600">{error}</p>}
                <button type="button" onClick={() => { setDraft(null); setError('') }} className="ml-auto h-9 rounded-lg px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100">Отмена</button>
                <button type="submit" disabled={saving} className="h-9 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800 disabled:bg-slate-200">{saving ? 'Сохраняем…' : 'Создать заявку'}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sidebar block: link the chat to an existing client, or create a new client from it.
function ClientLink({ chat, clients, client, onClientCreated }: {
  chat: CrmChat; clients: CrmClient[]; client?: CrmClient; onClientCreated?: (c: CrmClient) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState(chat.name)
  const [phone, setPhone] = useState(chat.phone || '')
  const [isRussia, setIsRussia] = useState(looksRussian(chat.phone))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const link = async (clientId: string | null) => {
    const { error } = await supabase.from('crm_chats').update({ client_id: clientId }).eq('id', chat.id)
    if (error) { setError(error.message); return }
    // Remember the number on the client card so the next chat from it links automatically.
    if (clientId && chat.phone) await supabase.from('clients').update({ phone: chat.phone }).eq('id', clientId).or('phone.is.null,phone.eq.')
  }

  const create = async () => {
    if (!name.trim()) return
    setSaving(true); setError('')
    const { data, error } = await supabase.from('clients')
      .insert({ name: name.trim(), phone: phone.trim() || null, is_russia: isRussia }).select('id, name, is_russia').single()
    if (error || !data) { setError(error?.message || 'Не удалось создать'); setSaving(false); return }
    onClientCreated?.(data)
    await supabase.from('crm_chats').update({ client_id: data.id }).eq('id', chat.id)
    setSaving(false); setCreating(false)
  }

  // Linked: one compact row — the name opens the client card, the icon unlinks.
  if (chat.client_id) return (
    <div className="rounded-2xl bg-white/[0.05] py-1.5 pl-3 pr-1.5">
      <div className="flex items-center gap-1">
        <Link href={`/dashboard/clients/${chat.client_id}`} title="Открыть карточку клиента"
          className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold text-white hover:text-slate-300">
          <span className="truncate">{client ? `${client.is_russia ? '🇷🇺' : '🇰🇿'} ${client.name}` : 'Клиент'}</span>
          <ExternalLink className="size-3.5 shrink-0 text-slate-500" />
        </Link>
        <button onClick={() => { if (confirm('Отвязать чат от клиента?')) link(null) }} title="Отвязать от клиента" aria-label="Отвязать от клиента"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-white">
          <Unlink className="size-3.5" />
        </button>
      </div>
      {error && <p className="pb-1 text-[12px] text-rose-400">{error}</p>}
    </div>
  )

  return (
    <div className={cn(P.card, 'space-y-2')}>
      <div className="flex h-7 items-center justify-between">
        <p className={P.title}><User className={P.icon} aria-hidden="true" />Клиент</p>
        <span className="text-[11px] font-medium text-amber-400">Новый</span>
      </div>

      {creating ? (
        <form onSubmit={e => { e.preventDefault(); create() }} className="space-y-1.5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя клиента" aria-label="Имя клиента" autoFocus className={P.input} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон" aria-label="Телефон" type="tel" className={P.input} />
          <div className={P.segment}>
            {[{ v: false, label: '🇰🇿 Казахстан' }, { v: true, label: '🇷🇺 Россия' }].map(o => (
              <button type="button" key={o.label} onClick={() => setIsRussia(o.v)}
                className={cn('h-8 flex-1 rounded-md text-[12px] font-medium transition-colors', isRussia === o.v ? P.segmentOn : P.segmentOff)}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 pt-1">
            <button disabled={saving || !name.trim()} className={cn(P.primary, 'flex-1')}>{saving ? 'Сохраняю…' : 'Создать клиента'}</button>
            <button type="button" onClick={() => setCreating(false)} className={P.ghost}>Отмена</button>
          </div>
        </form>
      ) : (
        <>
          <SearchableSelect dark placeholder="Привязать к существующему…" value=""
            options={clients.map(c => ({ value: c.id, label: `${c.is_russia ? '🇷🇺' : '🇰🇿'} ${c.name}` }))}
            onChange={v => { if (v) link(v) }} />
          <button onClick={() => setCreating(true)} className={cn(P.ghost, 'flex w-full items-center justify-center gap-2 bg-white/[0.06] text-slate-200')}>
            <UserPlus className="size-4" /> Новый клиент
          </button>
        </>
      )}
      {error && <p className="text-[12px] text-rose-400">{error}</p>}
    </div>
  )
}
