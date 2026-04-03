'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { cn, fmtDate } from '@/lib/utils'
import type { Conversation, ConversationMember, Message, MessageAttachment, MessageMention, Profile } from '@/types/database'
import {
  Search, Send, Paperclip, X, ArrowLeft, Plus, Users, User, Hash,
  Image as ImageIcon, FileText, Download, MessageSquare, AtSign
} from 'lucide-react'
import { useShipmentModal } from '@/lib/shipment-modal'

/* ── Helpers ── */
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'сейчас'
  if (mins < 60) return `${mins}м`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}ч`
  const days = Math.floor(hrs / 24)
  return `${days}д`
}

function getInitials(name: string | null) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/* ── Main Page ── */
export default function MessagesPage() {
  const supabase = createClient()
  const { profile } = useProfile()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!profile) return
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', profile.id)

    if (!memberships?.length) { setConversations([]); setLoading(false); return }

    const ids = memberships.map(m => m.conversation_id)
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('updated_at', { ascending: false })

    if (!convs) { setLoading(false); return }

    // Enrich with members, last message, unread count
    const enriched: Conversation[] = await Promise.all(convs.map(async (c) => {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('*, profile:profiles(*)')
        .eq('conversation_id', c.id)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const myMembership = members?.find(m => m.profile_id === profile.id)
      let unread = 0
      if (myMembership) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .gt('created_at', myMembership.last_read_at)
          .neq('sender_id', profile.id)
        unread = count || 0
      }

      return {
        ...c,
        members: members || [],
        last_message: msgs?.[0] || undefined,
        unread_count: unread,
      }
    }))

    setConversations(enriched)
    setLoading(false)
  }, [profile])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Realtime: refetch on new message
  useEffect(() => {
    const channel = supabase.channel('conv-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchConversations])

  const selectedConv = conversations.find(c => c.id === selectedId)

  function getConvName(c: Conversation) {
    if (c.type === 'group') return c.name || 'Группа'
    const other = c.members?.find(m => m.profile_id !== profile?.id)
    return other?.profile?.full_name || 'Чат'
  }

  function getConvInitials(c: Conversation) {
    if (c.type === 'group') return c.name?.[0]?.toUpperCase() || 'Г'
    const other = c.members?.find(m => m.profile_id !== profile?.id)
    return getInitials(other?.profile?.full_name || null)
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      {/* Mobile: show list or thread */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Conversation list */}
        <div className={cn(
          'flex flex-col border-r border-slate-100 bg-white',
          selectedId ? 'hidden md:flex md:w-[30%]' : 'w-full md:w-[30%]'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 h-[56px]">
            <h2 className="text-[16px] font-bold text-slate-900 font-heading">Сообщения</h2>
            <button onClick={() => setShowNew(true)}
              className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MessageSquare className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
                <p className="text-[14px] font-medium text-slate-400">Нет сообщений</p>
                <p className="text-[12px] text-slate-300 mt-1">Начните новый чат</p>
              </div>
            ) : conversations.map(c => (
              <button key={c.id} onClick={() => { setSelectedId(c.id); markRead(c.id) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50',
                  selectedId === c.id && 'bg-slate-50'
                )}>
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
                  c.type === 'group'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                )}>
                  {c.type === 'group' ? <Users className="w-4 h-4" /> : getConvInitials(c)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn('text-[13px] truncate', c.unread_count ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
                      {getConvName(c)}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {c.last_message ? timeAgo(c.last_message.created_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[12px] text-slate-400 truncate">
                      {c.last_message?.content?.slice(0, 50) || 'Нет сообщений'}
                    </p>
                    {(c.unread_count || 0) > 0 && (
                      <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message thread */}
        <div className={cn(
          'flex-1 flex flex-col bg-[#f8fafc] min-w-0',
          !selectedId && 'hidden md:flex'
        )}>
          {selectedConv ? (
            <MessageThread
              conversation={selectedConv}
              profile={profile!}
              onBack={() => setSelectedId(null)}
              onMessageSent={fetchConversations}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-3" strokeWidth={1} />
                <p className="text-[14px] text-slate-400">Выберите чат</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New conversation dialog */}
      {showNew && <NewConversationDialog
        profile={profile!}
        onClose={() => setShowNew(false)}
        onCreated={(id) => { setShowNew(false); setSelectedId(id); fetchConversations() }}
      />}
    </div>
  )

  async function markRead(convId: string) {
    if (!profile) return
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
  }
}

/* ── Message Thread ── */
function MessageThread({ conversation, profile, onBack, onMessageSent }: {
  conversation: Conversation
  profile: Profile
  onBack: () => void
  onMessageSent: () => void
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const otherName = conversation.type === 'dm'
    ? conversation.members?.find(m => m.profile_id !== profile.id)?.profile?.full_name || 'Чат'
    : conversation.name || 'Группа'

  const memberCount = conversation.members?.length || 0
  const { openShipment } = useShipmentModal()

  function handleMentionClick(m: MessageMention) {
    if (m.type === 'shipment') openShipment(m.id)
    if (m.type === 'client') window.location.href = `/dashboard/clients/${m.id}`
  }

  // Fetch messages
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(data || [])
      setLoading(false)
      // Mark as read
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .eq('profile_id', profile.id)
    }
    load()
  }, [conversation.id, profile.id])

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel(`messages-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          // Skip if already in list (own messages added after insert)
          setMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev
            return [...prev, data]
          })
          // Mark read
          await supabase
            .from('conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversation.id)
            .eq('profile_id', profile.id)
          onMessageSent()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversation.id, profile.id])

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100 shrink-0 h-[56px]">
        <button onClick={onBack} className="md:hidden w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
          conversation.type === 'group' ? 'bg-indigo-100 text-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
        )}>
          {conversation.type === 'group' ? <Users className="w-4 h-4" /> : getInitials(otherName)}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-slate-900">{otherName}</p>
          <p className="text-[11px] text-slate-400">
            {conversation.type === 'group' ? `${memberCount} участников` : 'Личные сообщения'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 w-3/4 rounded-xl" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-slate-400">Напишите первое сообщение</p>
          </div>
        ) : messages.map((msg, i) => {
          const isMine = msg.sender_id === profile.id
          const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id
          return (
            <div key={msg.id} className={cn('flex gap-2', isMine && 'flex-row-reverse')}>
              {showAvatar ? (
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-auto',
                  isMine ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                )}>
                  {getInitials(msg.sender?.full_name || null)}
                </div>
              ) : <div className="w-8 shrink-0" />}
              <div className={cn('max-w-[75%]', isMine && 'items-end')}>
                {showAvatar && !isMine && (
                  <p className="text-[11px] text-slate-400 mb-0.5 ml-1">{msg.sender?.full_name}</p>
                )}
                <div className={cn(
                  'rounded-2xl px-3.5 py-2',
                  isMine ? 'bg-slate-900 text-white rounded-br-md' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm'
                )}>
                  {/* Render content with mentions */}
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {renderContentWithMentions(msg.content, msg.mentions || [], handleMentionClick)}
                  </p>
                  {/* Attachments */}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((att, j) => (
                        <AttachmentItem key={j} att={att} isMine={isMine} />
                      ))}
                    </div>
                  )}
                </div>
                <p className={cn('text-[10px] text-slate-300 mt-0.5', isMine ? 'text-right mr-1' : 'ml-1')}>
                  {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} profileId={profile.id} onSent={onMessageSent}
        onOptimisticSend={(msg) => setMessages(prev => [...prev, msg])} senderProfile={profile} />
    </>
  )
}

/* ── Render mentions in text ── */
function renderContentWithMentions(text: string, mentions: MessageMention[], onMentionClick?: (m: MessageMention) => void) {
  if (!mentions.length) return text
  const parts: (string | JSX.Element)[] = []
  let remaining = text
  let key = 0

  for (const m of mentions) {
    const marker = `@${m.label}`
    const idx = remaining.indexOf(marker)
    if (idx === -1) continue
    if (idx > 0) parts.push(remaining.slice(0, idx))
    parts.push(
      <span key={key++} onClick={(e) => { e.stopPropagation(); onMentionClick?.(m) }}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[12px] font-medium cursor-pointer hover:bg-indigo-200 mx-0.5">
        {m.type === 'shipment' ? <Hash className="w-3 h-3" /> : <User className="w-3 h-3" />}
        {m.label}
      </span>
    )
    remaining = remaining.slice(idx + marker.length)
  }
  if (remaining) parts.push(remaining)
  return parts.length ? parts : text
}

/* ── Attachment Item ── */
function AttachmentItem({ att, isMine }: { att: MessageAttachment; isMine: boolean }) {
  const isImage = att.type?.startsWith('image/')
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener" className="block">
        <img src={att.url} alt={att.name} className="rounded-lg max-w-[200px] max-h-[150px] object-cover" />
      </a>
    )
  }
  return (
    <a href={att.url} target="_blank" rel="noopener"
      className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px]', isMine ? 'bg-white/10 text-white/90' : 'bg-slate-50 text-slate-600')}>
      <FileText className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{att.name}</span>
      <Download className="w-3 h-3 shrink-0 ml-auto" />
    </a>
  )
}

/* ── Message Input ── */
function MessageInput({ conversationId, profileId, onSent, onOptimisticSend, senderProfile }: {
  conversationId: string; profileId: string; onSent: () => void
  onOptimisticSend?: (msg: Message) => void; senderProfile?: Profile
}) {
  const supabase = createClient()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showShipmentPicker, setShowShipmentPicker] = useState(false)
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [shipmentPickerResults, setShipmentPickerResults] = useState<{ id: string; container_number: string; origin: string | null; destination_city: string | null; destination_station: string | null }[]>([])
  const [mentions, setMentions] = useState<MessageMention[]>([])
  const [sending, setSending] = useState(false)
  const [showMention, setShowMention] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Mention search results
  const [shipmentResults, setShipmentResults] = useState<{ id: string; container_number: string }[]>([])
  const [clientResults, setClientResults] = useState<{ id: string; name: string }[]>([])

  // Shipment picker search
  useEffect(() => {
    if (!showShipmentPicker) { setShipmentPickerResults([]); return }
    const timer = setTimeout(async () => {
      let query = supabase.from('shipments').select('id, container_number, origin, destination_city, destination_station').order('departure_date', { ascending: false }).limit(10)
      if (shipmentSearch.trim()) query = query.ilike('container_number', `%${shipmentSearch}%`)
      const { data } = await query
      setShipmentPickerResults(data || [])
    }, 200)
    return () => clearTimeout(timer)
  }, [shipmentSearch, showShipmentPicker])

  useEffect(() => {
    if (!showMention || !mentionQuery) { setShipmentResults([]); setClientResults([]); return }
    const timer = setTimeout(async () => {
      const [{ data: ships }, { data: clients }] = await Promise.all([
        supabase.from('shipments').select('id, container_number').ilike('container_number', `%${mentionQuery}%`).limit(5),
        supabase.from('clients').select('id, name').ilike('name', `%${mentionQuery}%`).limit(5),
      ])
      setShipmentResults(ships || [])
      setClientResults(clients || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [mentionQuery, showMention])

  function handleTextChange(val: string) {
    setText(val)
    // Detect @ trigger
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1)
      if (query.length > 0 && !query.includes(' ')) {
        setShowMention(true)
        setMentionQuery(query)
        return
      }
    }
    setShowMention(false)
  }

  function insertMention(m: MessageMention) {
    const lastAt = text.lastIndexOf('@')
    const newText = text.slice(0, lastAt) + `@${m.label} `
    setText(newText)
    setMentions(prev => [...prev, m])
    setShowMention(false)
    inputRef.current?.focus()
  }

  async function handleSend() {
    if ((!text.trim() && files.length === 0) || sending) return

    const msgText = text.trim()
    const msgMentions = [...mentions]
    const msgFiles = [...files]

    // Clear input immediately
    setText('')
    setFiles([])
    setMentions([])
    setSending(true)
    const attachments: MessageAttachment[] = []
    for (const file of msgFiles) {
      const path = `${conversationId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('message-attachments').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(path)
        attachments.push({ name: file.name, url: publicUrl, type: file.type, size: file.size })
      }
    }

    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profileId,
      content: msgText,
      attachments,
      mentions: msgMentions,
    }).select('*, sender:profiles(*)').single()

    if (inserted && onOptimisticSend) {
      onOptimisticSend(inserted)
    }

    setSending(false)
    onSent()
  }

  return (
    <div className="relative bg-white border-t border-slate-100 px-4 py-3">
      {/* Mention popover */}
      {showMention && (shipmentResults.length > 0 || clientResults.length > 0) && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[200px] overflow-y-auto z-20">
          {shipmentResults.length > 0 && (
            <>
              <p className="text-[10px] text-slate-400 font-semibold px-3 pt-2 pb-1">ПЕРЕВОЗКИ</p>
              {shipmentResults.map(s => (
                <button key={s.id} onClick={() => insertMention({ type: 'shipment', id: s.id, label: s.container_number })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 text-[13px] text-slate-700">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  {s.container_number}
                </button>
              ))}
            </>
          )}
          {clientResults.length > 0 && (
            <>
              <p className="text-[10px] text-slate-400 font-semibold px-3 pt-2 pb-1">КЛИЕНТЫ</p>
              {clientResults.map(c => (
                <button key={c.id} onClick={() => insertMention({ type: 'client', id: c.id, label: c.name })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 text-[13px] text-slate-700">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  {c.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-[11px] text-slate-600">
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Shipment picker popover */}
      {showShipmentPicker && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-[250px] overflow-hidden z-20 flex flex-col">
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={shipmentSearch} onChange={e => setShipmentSearch(e.target.value)} autoFocus
                placeholder="Номер контейнера..."
                className="w-full h-8 rounded-lg border border-slate-200 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-1 pb-2">
            {shipmentPickerResults.map(s => (
              <button key={s.id} onClick={() => {
                insertMention({ type: 'shipment', id: s.id, label: s.container_number })
                setShowShipmentPicker(false)
                setShipmentSearch('')
              }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 rounded-lg">
                <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{s.container_number}</p>
                  <p className="text-[10px] text-slate-400">{s.origin || '—'} → {s.destination_city || s.destination_station || '—'}</p>
                </div>
              </button>
            ))}
            {shipmentPickerResults.length === 0 && shipmentSearch && (
              <p className="text-[12px] text-slate-400 text-center py-4">Не найдено</p>
            )}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 shrink-0" title="Прикрепить файл">
          <Paperclip className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => { setShowShipmentPicker(!showShipmentPicker); setShowMention(false) }}
          className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', showShipmentPicker ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
          title="Указать перевозку">
          <Hash className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => {
          if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
          e.target.value = ''
        }} />
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Сообщение... (@упомянуть)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 max-h-[120px]"
          style={{ minHeight: '36px' }}
        />
        <button onClick={handleSend} disabled={sending || (!text.trim() && files.length === 0)}
          className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── New Conversation Dialog ── */
function NewConversationDialog({ profile, onClose, onCreated }: {
  profile: Profile
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const supabase = createClient()
  const [mode, setMode] = useState<'dm' | 'group'>('dm')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile[]>([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      let query = supabase.from('profiles').select('*').neq('id', profile.id).limit(20)
      if (search.trim()) query = query.ilike('full_name', `%${search}%`)
      const { data } = await query
      setUsers(data || [])
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  async function handleCreate() {
    if (selected.length === 0 || creating) return
    setCreating(true)

    // For DM: check existing
    if (mode === 'dm' && selected.length === 1) {
      const { data: existing } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('profile_id', profile.id)

      if (existing) {
        for (const e of existing) {
          const { data: conv } = await supabase.from('conversations').select('*').eq('id', e.conversation_id).eq('type', 'dm').single()
          if (!conv) continue
          const { data: members } = await supabase.from('conversation_members').select('profile_id').eq('conversation_id', conv.id)
          if (members?.length === 2 && members.some(m => m.profile_id === selected[0].id)) {
            onCreated(conv.id)
            return
          }
        }
      }
    }

    // Create new
    const { data: conv } = await supabase.from('conversations').insert({
      type: mode,
      name: mode === 'group' ? groupName || 'Группа' : null,
      created_by: profile.id,
    }).select().single()

    if (!conv) { setCreating(false); return }

    // Add members
    const memberInserts = [
      { conversation_id: conv.id, profile_id: profile.id },
      ...selected.map(s => ({ conversation_id: conv.id, profile_id: s.id })),
    ]
    await supabase.from('conversation_members').insert(memberInserts)

    onCreated(conv.id)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-[16px] font-bold text-slate-900 font-heading">Новый чат</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMode('dm')}
              className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                mode === 'dm' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              <User className="w-4 h-4" /> Личное
            </button>
            <button onClick={() => setMode('group')}
              className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                mode === 'group' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              <Users className="w-4 h-4" /> Группа
            </button>
          </div>

          {mode === 'group' && (
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Название группы"
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
          )}

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {selected.map(s => (
                <span key={s.id} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[12px] font-medium">
                  {s.full_name}
                  <button onClick={() => setSelected(prev => prev.filter(p => p.id !== s.id))} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск пользователей..."
              className="w-full h-9 rounded-lg border border-slate-200 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
          </div>

          {/* Results */}
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {users.filter(u => !selected.find(s => s.id === u.id)).map(u => (
              <button key={u.id} onClick={async () => {
                if (mode === 'dm') {
                  // Immediately create/open DM
                  setCreating(true)
                  // Check existing DM
                  const { data: existing } = await supabase.from('conversation_members').select('conversation_id').eq('profile_id', profile.id)
                  if (existing) {
                    for (const e of existing) {
                      const { data: conv } = await supabase.from('conversations').select('*').eq('id', e.conversation_id).eq('type', 'dm').single()
                      if (!conv) continue
                      const { data: members } = await supabase.from('conversation_members').select('profile_id').eq('conversation_id', conv.id)
                      if (members?.length === 2 && members.some(m => m.profile_id === u.id)) {
                        onCreated(conv.id); return
                      }
                    }
                  }
                  // Create new DM
                  const { data: conv } = await supabase.from('conversations').insert({ type: 'dm', name: null, created_by: profile.id }).select().single()
                  if (conv) {
                    await supabase.from('conversation_members').insert([
                      { conversation_id: conv.id, profile_id: profile.id },
                      { conversation_id: conv.id, profile_id: u.id },
                    ])
                    onCreated(conv.id)
                  }
                  setCreating(false)
                } else {
                  setSelected(prev => [...prev, u])
                }
              }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {getInitials(u.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800">{u.full_name}</p>
                  <p className="text-[11px] text-slate-400">{u.email}</p>
                </div>
                {mode === 'dm' && (
                  <span className="text-[11px] text-indigo-500 font-medium shrink-0">Написать</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          <button onClick={handleCreate} disabled={selected.length === 0 || creating}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-40">
            {creating ? 'Создание...' : 'Создать чат'}
          </button>
        </div>
      </div>
    </div>
  )
}
