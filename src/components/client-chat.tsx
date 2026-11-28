'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CrmThread, type CrmChat, type CrmClient } from '@/components/crm-thread'
import { waId } from '@/lib/wa-id'
import { MessageSquare, X } from 'lucide-react'

// The client's WhatsApp conversation, shown next to their card.
export function ClientChat({ client, onClose }: { client: CrmClient & { phone?: string | null }; onClose: () => void }) {
  const [chats, setChats] = useState<CrmChat[] | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const number = waId(client.phone)

  // Writing first: open (or link) the WhatsApp chat for the client's number. WhatsApp only lets a business
  // start a conversation with an approved template, so the thread opens on the template picker.
  const start = async () => {
    if (!number) return
    setStarting(true); setStartError('')
    const supabase = createClient()
    const { data: existing } = await supabase.from('crm_chats').select('*').eq('channel', 'whatsapp').eq('external_id', number).maybeSingle()
    const { data, error } = existing
      ? await supabase.from('crm_chats').update({ client_id: client.id }).eq('id', existing.id).select('*').single()
      // greeted_at: we started the talk, so the bot must not greet the client when they reply.
      : await supabase.from('crm_chats').insert({ channel: 'whatsapp', external_id: number, phone: client.phone, name: client.name, client_id: client.id, greeted_at: new Date().toISOString() }).select('*').single()
    setStarting(false)
    if (error || !data) { setStartError('Не удалось открыть чат. Попробуйте ещё раз.'); return }
    setChats([data as CrmChat])
  }
  const [pickedId, setPickedId] = useState<string | null>(null)

  useEffect(() => {
    createClient().from('crm_chats').select('*').eq('client_id', client.id).order('last_message_at', { ascending: false })
      .then(({ data }) => setChats(data || []))
  }, [client.id])

  const chat = chats?.find(c => c.id === pickedId) ?? chats?.[0]

  return (
    <>
    <div data-overlay className="fixed inset-0 z-40 bg-slate-900/10 animate-in fade-in duration-200" onClick={onClose} />
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
          <p className="text-[13px] font-medium text-slate-500">{chats ? 'Переписки с клиентом пока нет' : 'Загрузка…'}</p>
          {chats && (number ? <>
            <p className="mt-1 text-[12px] text-slate-500">Первое сообщение в WhatsApp — только шаблоном. Когда клиент ответит, можно писать свободно.</p>
            <button onClick={start} disabled={starting}
              className="mt-4 flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              <MessageSquare className="h-4 w-4" /> {starting ? 'Открываем…' : `Написать на +${number}`}
            </button>
            {startError && <p role="alert" className="mt-2 text-[12px] text-red-600">{startError}</p>}
          </> : <p className="mt-1 text-[12px] text-slate-500">Чтобы написать первым, добавьте клиенту телефон</p>)}
        </div>
      )}
    </div>
    </>
  )
}
