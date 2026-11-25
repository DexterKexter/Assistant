'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CrmThread, type CrmChat, type CrmClient } from '@/components/crm-thread'
import { MessageSquare, X } from 'lucide-react'

// The client's WhatsApp conversation, shown next to their card.
export function ClientChat({ client, onClose }: { client: CrmClient; onClose: () => void }) {
  const [chats, setChats] = useState<CrmChat[] | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('crm_chats').select('*').eq('client_id', client.id).order('last_message_at', { ascending: false })
      .then(({ data }) => setChats(data || []))
  }, [client.id])

  const chat = chats?.find(c => c.id === pickedId) ?? chats?.[0]

  return (
    <>
    <div className="fixed inset-0 z-40 bg-slate-900/10 animate-in fade-in duration-200" onClick={onClose} />
    <div className="fixed top-0 right-0 z-50 h-dvh w-full sm:w-[420px] flex flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
      <button onClick={onClose} aria-label="Закрыть чат"
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X className="w-4 h-4" />
      </button>
      {chats && chats.length > 1 && (
        <div className="flex gap-1 p-2 pr-12 border-b border-slate-100">
          {chats.map(c => (
            <button key={c.id} onClick={() => setPickedId(c.id)}
              className={cn('px-2.5 py-1 rounded-lg text-[12px] font-medium',
                c.id === chat?.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
              {c.phone || c.name || 'WhatsApp'}
            </button>
          ))}
        </div>
      )}
      {chat ? (
        <CrmThread key={chat.id} chat={chat} clients={[client]} side={false} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <MessageSquare className="w-10 h-10 text-slate-200 mb-3" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-slate-400">{chats ? 'Чата с клиентом пока нет' : 'Загрузка…'}</p>
          {chats && <p className="text-[12px] text-slate-300 mt-1">Появится, когда клиент напишет в WhatsApp и чат привяжут к нему</p>}
        </div>
      )}
    </div>
    </>
  )
}
