'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHAT_CATEGORIES, type ChatCategory } from '@/lib/chat-category'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { shipmentStatusText, shipmentStatusLabel } from '@/lib/shipment-status'
import { templateValues } from '@/lib/template-values'
import { TEMPLATES, TEMPLATE_FIELDS, compileTemplate, fillTemplate } from '@/lib/whatsapp-template'
import { SearchableSelect } from '@/components/searchable-select'
import { WaText } from '@/components/wa-text'
import Link from 'next/link'
import { ArrowLeft, Send, UserPlus, ExternalLink, PanelRight, X, Download } from 'lucide-react'

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

export function ClientBadge({ isNew }: { isNew: boolean }) {
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0',
      isNew ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
      {isNew ? 'Новый' : 'Клиент'}
    </span>
  )
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

      {side && panel && <aside className="absolute inset-y-0 right-0 z-10 shadow-xl lg:static lg:shadow-none flex flex-col w-[272px] shrink-0 border-l border-slate-100 bg-white overflow-y-auto animate-in slide-in-from-right duration-200">
        {chat.ai_category && (
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="mb-1 text-[12px] font-medium text-slate-400">ИИ · {CHAT_CATEGORIES[chat.ai_category].label}</p>
            {chat.ai_summary && <p className="text-[13px] leading-snug text-slate-700">{chat.ai_summary}</p>}
          </div>
        )}
        <ClientLink chat={chat} clients={clients} client={client} onClientCreated={onClientCreated} />
        <div className="px-4 py-3">
          <p className="mb-1 text-[12px] font-medium text-slate-400">Перевозки{chat.client_id && shipments.length > 0 ? ` · ${shipments.length}` : ''}</p>
          {!chat.client_id && <p className="text-[12px] text-slate-400">Появятся после привязки клиента.</p>}
          {chat.client_id && shipments.length === 0 && <p className="text-[12px] text-slate-400">Перевозок пока нет.</p>}
          {chat.client_id && shipments.map(s => (
            <div key={s.id} className="group -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px] font-semibold text-slate-800">{s.container_number || 'без номера'}</p>
                <p className="truncate text-[11px] text-slate-400">{shipmentStatusLabel(s, !!client?.is_russia)}</p>
              </div>
              <button onClick={() => send(shipmentStatusText(s, !!client?.is_russia), s.id)} disabled={sending || windowClosed}
                title={windowClosed ? 'Клиент не писал больше 24 часов — отправьте шаблон' : 'Отправить статус клиенту'} aria-label={`Отправить статус ${s.container_number || ''}`}
                className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-slate-300 hover:bg-white hover:text-slate-700 group-hover:text-slate-500 disabled:opacity-30">
                <Send className="w-3.5 h-3.5" />
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

  return (
    <div className="px-4 py-3 border-b border-slate-100 space-y-2">
      <div className="flex h-8 items-center justify-between">
        <p className="text-[12px] font-medium text-slate-400">Клиент</p>
        {!chat.client_id && <ClientBadge isNew />}
      </div>

      {chat.client_id ? (
        <>
          <Link href={`/dashboard/clients/${chat.client_id}`}
            className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50">
            <span className="flex-1 truncate">{client ? `${client.is_russia ? '🇷🇺' : '🇰🇿'} ${client.name}` : 'Клиент'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <button onClick={() => link(null)} className="text-[12px] text-slate-400 hover:text-slate-600">Отвязать от клиента</button>
        </>
      ) : creating ? (
        <form onSubmit={e => { e.preventDefault(); create() }} className="space-y-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя клиента" aria-label="Имя клиента" autoFocus
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон" aria-label="Телефон" type="tel"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300" />
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {[{ v: false, label: '🇰🇿 Казахстан' }, { v: true, label: '🇷🇺 Россия' }].map(o => (
              <button type="button" key={o.label} onClick={() => setIsRussia(o.v)}
                className={cn('flex-1 py-1 rounded-lg text-[12px] font-medium', isRussia === o.v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button disabled={saving || !name.trim()} className="flex-1 rounded-xl bg-slate-900 text-white text-[13px] font-medium py-2 disabled:opacity-40">
              {saving ? 'Сохраняю…' : 'Создать клиента'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="px-3 rounded-xl border border-slate-200 text-[13px] text-slate-500">Отмена</button>
          </div>
        </form>
      ) : (
        <>
          <SearchableSelect placeholder="Привязать к существующему…" value=""
            options={clients.map(c => ({ value: c.id, label: `${c.is_russia ? '🇷🇺' : '🇰🇿'} ${c.name}` }))}
            onChange={v => { if (v) link(v) }} />
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
            <UserPlus className="w-4 h-4" /> Новый клиент
          </button>
        </>
      )}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  )
}
