'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { shipmentStatusText } from '@/lib/shipment-status'
import { templateValues } from '@/lib/template-values'
import { TEMPLATES, TEMPLATE_FIELDS, compileTemplate, fillTemplate } from '@/lib/whatsapp-template'
import { SearchableSelect } from '@/components/searchable-select'
import { WaText } from '@/components/wa-text'
import Link from 'next/link'
import { ArrowLeft, Send, Package, UserPlus, ExternalLink } from 'lucide-react'

export type CrmChat = {
  id: string; channel: 'whatsapp'; name: string; username: string | null; phone: string | null
  client_id: string | null; last_message_text: string | null; last_message_at: string; unread_count: number
}
type Msg = { id: string; chat_id: string; direction: 'in' | 'out'; text: string; created_at: string }
export type CrmClient = { id: string; name: string; is_russia: boolean }
type ShipmentRow = Parameters<typeof shipmentStatusText>[0] & { id: string }

const supabase = createClient()
export const chatTime = (d: string) => new Date(d).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })

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
  const client = clients.find(c => c.id === chat.client_id)

  useEffect(() => {
    supabase.from('crm_messages').select('*').eq('chat_id', chat.id).order('created_at').then(({ data }) => setMessages(data || []))
    const ch = supabase.channel(`crm-msg-${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `chat_id=eq.${chat.id}` },
        p => setMessages(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new as Msg]))
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

  async function send(body: string, shipmentId?: string, template?: string) {
    if (!template && !body.trim()) return
    setSending(true); setError('')
    const res = await fetch('/api/crm/send', { method: 'POST', body: JSON.stringify({ chatId: chat.id, text: body, shipmentId, template }) })
    setSending(false)
    if (!res.ok) { setError(await res.text()); return }
    const msg: Msg = await res.json()
    setMessages(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
    if (!shipmentId && !template) setText('')
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#f8fafc] min-w-0">
        <div className="flex items-center gap-3 px-4 h-[56px] border-b border-slate-100 bg-white">
          {onBack && <button onClick={onBack} className="md:hidden" aria-label="Назад"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>}
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{client?.name || chat.name || 'Без имени'}</p>
            <p className="text-[11px] text-slate-400 truncate">
              WhatsApp{chat.phone ? ` · ${chat.phone}` : ''}
            </p>
          </div>
        </div>
        <div ref={list} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.map(m => (
            <div key={m.id} className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] whitespace-pre-wrap break-words',
                m.direction === 'out' ? 'bg-indigo-500 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md')}>
                <WaText text={m.text} />
                <span className={cn('block text-[10px] mt-1 text-right', m.direction === 'out' ? 'text-indigo-200' : 'text-slate-400')}>
                  {new Date(m.created_at).toLocaleDateString('ru')} {chatTime(m.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="px-4 py-1 text-[12px] text-red-500 bg-red-50">Не отправлено: {error}</p>}
        {windowClosed ? (
          <div className="p-3 border-t border-slate-100 bg-white space-y-2">
            <p className="text-[12px] text-amber-700">Клиент не писал больше 24 часов — можно отправить только шаблон</p>
            <>
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Шаблон" value={tplName} onChange={e => setTplName(e.target.value)}
                    className="flex-1 min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-[13px] bg-white outline-none focus:border-indigo-300">
                    <option value="">Выберите шаблон…</option>
                    {TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.title}</option>)}
                  </select>
                  {tplNeedsShipment && (
                    <select aria-label="Контейнер" value={tplShipment} onChange={e => setTplShipment(e.target.value)}
                      className="flex-1 min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-[13px] bg-white outline-none focus:border-indigo-300">
                      <option value="">{shipments.length ? 'Выберите контейнер…' : 'У клиента нет перевозок'}</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.container_number || 'без номера'} · {[s.origin, s.destination_city].filter(Boolean).join(' → ')}</option>)}
                    </select>
                  )}
                </div>
                {tplPreview && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><WaText text={tplPreview} /></p>}
                <button onClick={() => send('', tplShipment || undefined, tplName)} disabled={sending || !tpl || (tplNeedsShipment && !tplShipment)}
                  className="w-full h-9 rounded-xl bg-slate-900 text-white text-[13px] font-medium disabled:opacity-40">
                  {sending ? 'Отправляю…' : 'Отправить шаблон'}
                </button>
            </>
          </div>
        ) : (
        <form onSubmit={e => { e.preventDefault(); send(text) }} className="flex items-end gap-2 p-3 border-t border-slate-100 bg-white">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Сообщение клиенту…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 max-h-32" />
          <button disabled={sending || !text.trim()} aria-label="Отправить"
            className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
        )}
      </div>

      {side && <aside className="hidden lg:flex flex-col w-[300px] border-l border-slate-100 bg-white overflow-y-auto">
        <ClientLink chat={chat} clients={clients} client={client} onClientCreated={onClientCreated} />
        <div className="p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Перевозки</p>
          {!chat.client_id && <p className="text-[12px] text-slate-400">Привяжите клиента, чтобы увидеть его контейнеры</p>}
          {chat.client_id && shipments.length === 0 && <p className="text-[12px] text-slate-400">Нет перевозок</p>}
          {chat.client_id && shipments.map(s => {
            const status = shipmentStatusText(s, !!client?.is_russia)
            return (
              <div key={s.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-[13px] font-mono font-semibold text-slate-800">{s.container_number || '—'}</span>
                </div>
                <p className="text-[12px] text-slate-500 whitespace-pre-line">{status.split('\n').slice(1).join('\n')}</p>
                <button onClick={() => send(status, s.id)} disabled={sending}
                  className="w-full text-[12px] font-medium rounded-lg border border-slate-200 py-1.5 hover:bg-slate-50 disabled:opacity-40">
                  Отправить статус клиенту
                </button>
              </div>
            )
          })}
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
    <div className="p-4 border-b border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Клиент</p>
        <ClientBadge isNew={!chat.client_id} />
      </div>

      {chat.client_id ? (
        <>
          <Link href={`/dashboard/clients/${chat.client_id}`}
            className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-50">
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
