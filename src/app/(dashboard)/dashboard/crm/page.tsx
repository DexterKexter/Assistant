'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChatTabs } from '@/components/chat-tabs'
import { CrmThread, ClientBadge, chatTime as time, type CrmChat as Chat, type CrmClient as ClientRow } from '@/components/crm-thread'
import { Inbox, Search } from 'lucide-react'

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
      <div className={cn('flex flex-col border-r border-slate-100', selectedId ? 'hidden md:flex md:w-[28%]' : 'w-full md:w-[28%]')}>
        <div className="flex items-center px-4 border-b border-slate-100 h-[56px]">
          <ChatTabs />
        </div>
        <div className="px-3 pt-3 pb-2 space-y-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Имя, телефон…" aria-label="Поиск по чатам"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-[13px] outline-none focus:border-indigo-300" />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={cn('px-2.5 py-1 rounded-lg text-[12px] font-medium whitespace-nowrap',
                  filter === f.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Inbox className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-slate-400">Пока нет чатов</p>
              <p className="text-[12px] text-slate-300 mt-1">Сообщения клиентов из WhatsApp появятся здесь</p>
            </div>
          ) : visible.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-slate-400">Ничего не найдено</p>
          ) : visible.map(c => (
            <button key={c.id} onClick={() => open(c)}
              className={cn('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50', selectedId === c.id && 'bg-slate-50')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white bg-emerald-500">
                {title(c).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn('text-[13px] truncate', c.unread_count ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
                    {title(c)}
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
        <CrmThread key={selected.id} chat={selected} clients={clients} onBack={() => setSelectedId(null)}
          onClientCreated={c => setClients(cs => [...cs, c].sort((a, b) => a.name.localeCompare(b.name)))} />
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#f8fafc]">
          <p className="text-[14px] text-slate-400">Выберите чат</p>
        </div>
      )}
    </div>
  )
}

