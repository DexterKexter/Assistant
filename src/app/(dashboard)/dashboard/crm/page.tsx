'use client'

import { CHAT_CATEGORIES } from '@/lib/chat-category'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChatTabs } from '@/components/chat-tabs'
import { CrmThread, chatTime as time, type CrmChat as Chat, type CrmClient as ClientRow } from '@/components/crm-thread'
import { Inbox, MessageSquare, Search } from 'lucide-react'

const supabase = createClient()
const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Новые' },
  { id: 'unread', label: 'Непрочитанные' },
] as const
type Filter = typeof FILTERS[number]['id']

export default function CrmPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

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

  const title = (c: Chat) => clientName(c.client_id) || c.name || c.phone || 'Без имени'
  const q = query.trim().toLowerCase()
  const visible = chats.filter(c =>
    (filter === 'all' || (filter === 'new' ? !c.client_id : c.unread_count > 0)) &&
    (!q || `${title(c)} ${c.phone || ''} ${c.username || ''}`.toLowerCase().includes(q)))

  const open = (c: Chat) => {
    setSelectedId(c.id)
    if (c.unread_count) supabase.from('crm_chats').update({ unread_count: 0 }).eq('id', c.id).then()
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-white">
      <div className={cn('flex flex-col border-r border-slate-100 md:w-[300px] md:shrink-0', selectedId ? 'hidden md:flex' : 'w-full')}>
        <div className="flex items-end px-4 h-14 shrink-0 border-b border-slate-100">
          <ChatTabs />
        </div>
        <div className="px-3 pt-3 pb-1.5 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск" aria-label="Поиск по чатам"
              className="w-full h-9 rounded-lg bg-slate-100 pl-8 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:bg-slate-50 focus:ring-1 focus:ring-slate-300" />
          </div>
          <div className="flex gap-0.5">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                className={cn('px-2 py-1 rounded-md text-[12px] whitespace-nowrap',
                  filter === f.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-400 hover:text-slate-700')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="p-2 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Inbox className="w-9 h-9 text-slate-200 mb-2" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-slate-500">Пока нет чатов</p>
              <p className="text-[12px] text-slate-400 mt-0.5">Сообщения клиентов из WhatsApp появятся здесь</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-slate-400">Ничего не найдено</p>
          ) : visible.map(c => (
            <button key={c.id} onClick={() => open(c)}
              className={cn('w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left', selectedId === c.id ? 'bg-slate-100' : 'hover:bg-slate-50')}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-slate-200/70 text-slate-600">
                {title(c).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <p className={cn('text-[13px] truncate', c.unread_count ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{title(c)}</p>
                  {!c.client_id && <span className="shrink-0 text-[10px] font-semibold text-amber-600">новый</span>}
                  {c.ai_category && <span className={cn('shrink-0 rounded px-1 text-[10px] font-medium', CHAT_CATEGORIES[c.ai_category].className)}>{CHAT_CATEGORIES[c.ai_category].label}</span>}
                  <span className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400">{time(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn('flex-1 truncate text-[12px]', c.unread_count ? 'text-slate-700' : 'text-slate-400')}>{c.last_message_text}</p>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-semibold flex items-center justify-center">{c.unread_count}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <CrmThread key={selected.id} chat={selected} clients={clients} onBack={() => setSelectedId(null)}
          onClientCreated={c => setClients(cs => [...cs, c].sort((a, b) => a.name.localeCompare(b.name)))} />
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-2 bg-[#f1f3f6]">
          <MessageSquare className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
          <p className="text-[13px] text-slate-400">Выберите чат слева</p>
        </div>
      )}
    </div>
  )
}
