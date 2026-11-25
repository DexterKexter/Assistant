'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { shipmentStatusText } from '@/lib/shipment-status'
import { SearchableSelect } from '@/components/searchable-select'
import { ArrowLeft, Inbox, Send, Package } from 'lucide-react'

type Chat = {
  id: string; channel: 'telegram' | 'whatsapp'; name: string; username: string | null; phone: string | null
  client_id: string | null; last_message_text: string | null; last_message_at: string; unread_count: number
}
type Msg = { id: string; chat_id: string; direction: 'in' | 'out'; text: string; created_at: string }
type ClientRow = { id: string; name: string; is_russia: boolean }
type ShipmentRow = Parameters<typeof shipmentStatusText>[0] & { id: string }

const supabase = createClient()
const time = (d: string) => new Date(d).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })

export default function CrmPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => supabase.from('crm_chats').select('*').order('last_message_at', { ascending: false })
      .then(({ data }) => { setChats(data || []); setLoading(false) })
    load()
    supabase.from('clients').select('id, name, is_russia').order('name').then(({ data }) => setClients(data || []))
    const ch = supabase.channel('crm-chats').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_chats' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const selected = chats.find(c => c.id === selectedId)
  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name

  const open = (c: Chat) => {
    setSelectedId(c.id)
    if (c.unread_count) supabase.from('crm_chats').update({ unread_count: 0 }).eq('id', c.id).then()
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-white">
      <div className={cn('flex flex-col border-r border-slate-100', selectedId ? 'hidden md:flex md:w-[28%]' : 'w-full md:w-[28%]')}>
        <div className="flex items-center px-4 border-b border-slate-100 h-[56px]">
          <h2 className="text-[16px] font-bold text-slate-900 font-heading">CRM · Чаты клиентов</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Inbox className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-slate-400">Пока нет чатов</p>
              <p className="text-[12px] text-slate-300 mt-1">Сообщения клиентов из Telegram появятся здесь</p>
            </div>
          ) : chats.map(c => (
            <button key={c.id} onClick={() => open(c)}
              className={cn('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50', selectedId === c.id && 'bg-slate-50')}>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white',
                c.channel === 'telegram' ? 'bg-sky-500' : 'bg-emerald-500')}>
                {c.channel === 'telegram' ? 'TG' : 'WA'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-[13px] truncate', c.unread_count ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
                    {clientName(c.client_id) || c.name || c.phone || 'Без имени'}
                  </p>
                  <ClientBadge isNew={!c.client_id} />
                  <span className="ml-auto text-[10px] text-slate-400 shrink-0">{time(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[12px] text-slate-400 truncate">{c.last_message_text}</p>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 ml-2 min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <Thread key={selected.id} chat={selected} clients={clients} onBack={() => setSelectedId(null)} />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#f8fafc]">
          <p className="text-[14px] text-slate-400">Выберите чат</p>
        </div>
      )}
    </div>
  )
}

function ClientBadge({ isNew }: { isNew: boolean }) {
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0',
      isNew ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
      {isNew ? 'Новый' : 'Клиент'}
    </span>
  )
}

function Thread({ chat, clients, onBack }: { chat: Chat; clients: ClientRow[]; onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const client = clients.find(c => c.id === chat.client_id)

  useEffect(() => {
    supabase.from('crm_messages').select('*').eq('chat_id', chat.id).order('created_at').then(({ data }) => setMessages(data || []))
    const ch = supabase.channel(`crm-msg-${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `chat_id=eq.${chat.id}` },
        p => setMessages(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new as Msg]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [chat.id])

  useEffect(() => { bottom.current?.scrollIntoView() }, [messages])

  useEffect(() => {
    if (!chat.client_id) return
    supabase.from('shipments')
      .select('id, container_number, origin, destination_city, destination_station, departure_date, arrival_date, delivery_date, is_completed')
      .eq('client_id', chat.client_id).order('departure_date', { ascending: false, nullsFirst: true }).limit(20)
      .then(({ data }) => setShipments(data || []))
  }, [chat.client_id])

  async function send(body: string, shipmentId?: string) {
    if (!body.trim()) return
    setSending(true); setError('')
    const res = await fetch('/api/crm/send', { method: 'POST', body: JSON.stringify({ chatId: chat.id, text: body, shipmentId }) })
    setSending(false)
    if (!res.ok) { setError(await res.text()); return }
    const msg: Msg = await res.json()
    setMessages(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
    if (!shipmentId) setText('')
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#f8fafc] min-w-0">
        <div className="flex items-center gap-3 px-4 h-[56px] border-b border-slate-100 bg-white">
          <button onClick={onBack} className="md:hidden"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{client?.name || chat.name || 'Без имени'}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {chat.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}{chat.username ? ` · @${chat.username}` : ''}{chat.phone ? ` · ${chat.phone}` : ''}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.map(m => (
            <div key={m.id} className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] whitespace-pre-wrap break-words',
                m.direction === 'out' ? 'bg-indigo-500 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md')}>
                {m.text}
                <span className={cn('block text-[10px] mt-1 text-right', m.direction === 'out' ? 'text-indigo-200' : 'text-slate-400')}>
                  {new Date(m.created_at).toLocaleDateString('ru')} {time(m.created_at)}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        {error && <p className="px-4 py-1 text-[12px] text-red-500 bg-red-50">Не отправлено: {error}</p>}
        <form onSubmit={e => { e.preventDefault(); send(text) }} className="flex items-end gap-2 p-3 border-t border-slate-100 bg-white">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder="Сообщение клиенту…"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 max-h-32" />
          <button disabled={sending || !text.trim()} aria-label="Отправить"
            className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <aside className="hidden lg:flex flex-col w-[300px] border-l border-slate-100 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Клиент</p>
            <ClientBadge isNew={!chat.client_id} />
          </div>
          <SearchableSelect placeholder="Привязать к клиенту…" value={chat.client_id || ''}
            options={clients.map(c => ({ value: c.id, label: `${c.is_russia ? '🇷🇺' : '🇰🇿'} ${c.name}` }))}
            onChange={v => supabase.from('crm_chats').update({ client_id: v || null }).eq('id', chat.id).then()} />
        </div>
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
      </aside>
    </>
  )
}
