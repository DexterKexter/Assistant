'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useProfile } from '@/lib/useProfile'
import { useShipmentModal } from '@/lib/shipment-modal'
import { cn } from '@/lib/utils'
import {
  Send,
  Sparkles,
  Loader2,
  Wrench,
  Ship,
  Users,
  TrendingUp,
  Map as MapIcon,
  Truck,
  Trash2,
  Plus,
  Hash,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

const QUICK_PROMPTS = [
  { icon: Ship, label: 'Сколько перевозок в пути?', text: 'Сколько перевозок сейчас в пути и сколько на границе?' },
  { icon: TrendingUp, label: 'Финансы за месяц', text: 'Покажи финансовую сводку за последние 30 дней' },
  { icon: MapIcon, label: 'Топ маршрутов', text: 'Какие топ-5 направлений по количеству перевозок?' },
  { icon: Truck, label: 'Активные перевозчики', text: 'Покажи список перевозчиков с их активными перевозками' },
  { icon: Users, label: 'Клиенты из РФ', text: 'Сколько у нас клиентов из России? Покажи топ по количеству перевозок' },
  { icon: Ship, label: 'Контейнеры с Дубая', text: 'Покажи последние контейнеры из Дубая' },
]

function getInitials(name: string | null | undefined) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// localStorage key (per-user)
const STORAGE_KEY_PREFIX = 'agent-chat-history:'
const MAX_PERSISTED_MESSAGES = 100 // safety cap

export default function AgentPage() {
  const { profile } = useProfile()
  const storageKey = profile?.id ? `${STORAGE_KEY_PREFIX}${profile.id}` : null
  const [hydrated, setHydrated] = useState(false)

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
  })

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  // ── Hide mobile bottom nav while on this page (input is at the bottom) ──
  useEffect(() => {
    document.documentElement.setAttribute('data-chat-open', 'true')
    return () => document.documentElement.removeAttribute('data-chat-open')
  }, [])

  // ── Hydrate from localStorage on mount (once profile is available) ──
  useEffect(() => {
    if (!storageKey || hydrated) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw)
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved)
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat history:', e)
    }
    setHydrated(true)
  }, [storageKey, hydrated, setMessages])

  // ── Persist to localStorage whenever messages change (after streaming finishes) ──
  useEffect(() => {
    if (!storageKey || !hydrated) return
    if (isLoading) return // don't write mid-stream — write when stable
    try {
      // Cap to last N messages and strip ephemeral fields if any
      const toSave = messages.slice(-MAX_PERSISTED_MESSAGES)
      if (toSave.length === 0) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(toSave))
      }
    } catch (e) {
      console.warn('Failed to persist chat history:', e)
    }
  }, [messages, storageKey, hydrated, isLoading])

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, status])

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  function handleQuickPrompt(text: string) {
    if (isLoading) return
    sendMessage({ text })
  }

  function handleClear() {
    setMessages([])
    if (storageKey) {
      try { localStorage.removeItem(storageKey) } catch {}
    }
    inputRef.current?.focus()
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-100 shrink-0 h-[56px]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
            <Sparkles className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 font-heading leading-tight">AI Ассистент</h1>
            <p className="text-[11px] text-slate-400 leading-tight">Управление перевозками через диалог</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[12px] font-medium"
              title="Новый чат"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новый чат</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPrompt={handleQuickPrompt} userName={profile?.full_name} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} userInitials={getInitials(profile?.full_name)} />
            ))}
            {(() => {
              if (!isLoading) return null
              const last = messages[messages.length - 1]
              const hasText = last?.parts?.some((p: any) => p.type === 'text' && p.text)
              if (!last || last.role === 'user' || !hasText) return <ThinkingIndicator />
              return null
            })()}
            {error && <ErrorBubble error={error} />}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-4 md:px-6 py-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Спросите что угодно про перевозки, клиентов, финансы..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] text-slate-700 placeholder:text-slate-400 focus:outline-none max-h-[140px] disabled:opacity-50"
              style={{ minHeight: '24px' }}
            />
            {isLoading ? (
              <button
                type="button"
                onClick={() => stop()}
                className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0"
                title="Остановить"
              >
                <div className="w-3 h-3 bg-slate-700 rounded-sm" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 shrink-0"
                title="Отправить"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            AI ассистент использует данные из базы. Может ошибаться — проверяйте важную информацию.
          </p>
        </form>
      </div>
    </div>
  )
}

/* ── Empty state with quick prompts ── */
function EmptyState({ onPrompt, userName }: { onPrompt: (t: string) => void; userName?: string | null }) {
  const firstName = userName?.split(' ')[0]
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-10">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-5">
        <Sparkles className="w-7 h-7 text-white" strokeWidth={2} />
      </div>
      <h2 className="text-[22px] md:text-[26px] font-bold text-slate-900 font-heading text-center">
        Привет{firstName ? `, ${firstName}` : ''}!
      </h2>
      <p className="text-[14px] text-slate-500 text-center mt-1.5 max-w-md">
        Задавайте вопросы о перевозках, клиентах, финансах. Я найду ответ в базе данных.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8 w-full max-w-2xl">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onPrompt(p.text)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors">
              <p.icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate">{p.label}</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.text}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Message bubble ── */
function MessageBubble({ message, userInitials }: { message: any; userInitials: string }) {
  const isUser = message.role === 'user'

  // Extract text + tool calls from parts (AI SDK v6)
  const textParts: string[] = []
  const toolCalls: { name: string; state: string; result?: any }[] = []
  const charts: ChartSpec[] = []

  for (const part of message.parts || []) {
    if (part.type === 'text') textParts.push(part.text || '')
    else if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
      const toolName = part.type.replace('tool-', '')
      const isChart = toolName === 'render_chart'
      const isDone = part.state === 'output-available'
      if (isChart && isDone && part.output) {
        charts.push(part.output as ChartSpec)
      } else {
        toolCalls.push({
          name: toolName,
          state: part.state || 'pending',
          result: part.output,
        })
      }
    }
  }

  const text = textParts.join('')

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
          isUser
            ? 'bg-slate-200 text-slate-600'
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
        )}
      >
        {isUser ? userInitials : <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />}
      </div>

      <div className={cn('flex flex-col max-w-[85%] min-w-0', isUser && 'items-end')}>
        {/* Tool calls (only for assistant) */}
        {!isUser && toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {toolCalls.map((tc, i) => (
              <ToolCallChip key={i} tool={tc} />
            ))}
          </div>
        )}

        {/* Charts */}
        {!isUser && charts.length > 0 && (
          <div className="space-y-2 mb-2 w-full">
            {charts.map((c, i) => (
              <ChartCard key={i} spec={c} />
            ))}
          </div>
        )}

        {/* Text content */}
        {text && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed',
              isUser
                ? 'bg-slate-900 text-white rounded-br-md'
                : 'bg-slate-50 text-slate-800 rounded-bl-md'
            )}
          >
            <FormattedText text={text} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tool call chip ── */
const TOOL_LABELS: Record<string, string> = {
  get_stats: 'Статистика',
  search_shipments: 'Поиск перевозок',
  get_shipment: 'Детали перевозки',
  list_clients: 'Список клиентов',
  list_carriers: 'Перевозчики',
  finance_summary: 'Финансы',
  top_routes: 'Маршруты',
  render_chart: 'График',
  create_shipment: 'Создание перевозки',
  update_shipment: 'Обновление перевозки',
  create_client: 'Создание клиента',
  create_carrier: 'Создание перевозчика',
}

const MUTATION_TOOLS = new Set(['create_shipment', 'update_shipment', 'create_client', 'create_carrier'])

function ToolCallChip({ tool }: { tool: { name: string; state: string; result?: any } }) {
  const isRunning = tool.state === 'input-streaming' || tool.state === 'input-available'
  const isDone = tool.state === 'output-available' || tool.state === 'output-error'
  const isMutation = MUTATION_TOOLS.has(tool.name)
  const hasError = isDone && tool.result?.error
  const label = TOOL_LABELS[tool.name] || tool.name

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium max-w-fit border',
        hasError
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : isMutation
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-200 text-slate-600'
      )}
    >
      {isRunning ? (
        <Loader2 className={cn('w-3 h-3 animate-spin', isMutation ? 'text-emerald-500' : 'text-indigo-500')} />
      ) : hasError ? (
        <span className="text-rose-500 font-bold">!</span>
      ) : (
        <Wrench className={cn('w-3 h-3', isMutation ? 'text-emerald-600' : 'text-emerald-500')} />
      )}
      <span>{label}</span>
      {isDone && !hasError && tool.result?.count !== undefined && (
        <span className="text-slate-400">· {tool.result.count}</span>
      )}
      {isDone && tool.result?.success && (
        <span className="text-emerald-600">✓</span>
      )}
    </div>
  )
}

/* ── Chart card (rendered from render_chart tool output) ── */
type ChartSpec = {
  type: 'bar' | 'line' | 'area' | 'pie'
  title: string
  data: { name: string; value: number }[]
  unit?: string
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
}

const CHART_COLORS: Record<NonNullable<ChartSpec['color']>, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
}

const PIE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899']

function formatChartValue(v: number, unit?: string) {
  const abs = Math.abs(v)
  let s: string
  if (abs >= 1_000_000) s = (v / 1_000_000).toFixed(1) + 'M'
  else if (abs >= 1_000) s = (v / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'K'
  else s = String(v)
  return unit ? `${s} ${unit}` : s
}

function ChartCard({ spec }: { spec: ChartSpec }) {
  const color = CHART_COLORS[spec.color || 'indigo']
  const isPie = spec.type === 'pie'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <p className="text-[13px] font-semibold text-slate-800">{spec.title}</p>
        {spec.unit && <p className="text-[10px] text-slate-400 mt-0.5">в {spec.unit}</p>}
      </div>
      <div className="p-3" style={{ width: '100%', height: 240 }}>
        <ChartInner spec={spec} color={color} isPie={isPie} />
      </div>
    </div>
  )
}

function ChartInner({ spec, color, isPie }: { spec: ChartSpec; color: string; isPie: boolean }) {
  const tickStyle = { fontSize: 11, fill: '#64748b' }
  const tooltipStyle = {
    contentStyle: {
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      fontSize: 12,
      padding: '6px 10px',
      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
    },
    formatter: (v: any) => formatChartValue(Number(v), spec.unit),
  }

  if (isPie) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={spec.data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {spec.data.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(v: any) => <span className="text-slate-600">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (spec.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: any) => formatChartValue(Number(v))} width={36} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (spec.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: any) => formatChartValue(Number(v))} width={36} />
          <Tooltip {...tooltipStyle} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={false} interval={0} angle={spec.data.length > 6 ? -25 : 0} textAnchor={spec.data.length > 6 ? 'end' : 'middle'} height={spec.data.length > 6 ? 50 : 30} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} tickFormatter={(v: any) => formatChartValue(Number(v))} width={36} />
        <Tooltip {...tooltipStyle} cursor={{ fill: '#f1f5f955' }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Error bubble ── */
function ErrorBubble({ error }: { error: Error }) {
  const msg = error.message || String(error)
  const isAuthError = /authentication|api[_-]?key|AI_GATEWAY_API_KEY|unauthorized/i.test(msg)
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-rose-600 text-[14px] font-bold">!</span>
      </div>
      <div className="bg-rose-50 border border-rose-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
        <p className="text-[13px] font-semibold text-rose-900 mb-1">Не удалось получить ответ</p>
        {isAuthError ? (
          <div className="text-[12px] text-rose-700 space-y-2">
            <p>AI Gateway не настроен. Добавьте API ключ:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Получите ключ на <a href="https://vercel.com/dashboard/ai/api-keys" target="_blank" rel="noopener" className="underline font-medium">vercel.com/dashboard/ai/api-keys</a></li>
              <li>Добавьте в <code className="px-1 py-0.5 bg-rose-100 rounded font-mono">.env.local</code>: <code className="px-1 py-0.5 bg-rose-100 rounded font-mono">AI_GATEWAY_API_KEY=...</code></li>
              <li>Перезапустите dev сервер</li>
            </ol>
          </div>
        ) : (
          <p className="text-[12px] text-rose-700 whitespace-pre-wrap">{msg}</p>
        )}
      </div>
    </div>
  )
}

/* ── Thinking indicator with rotating funny phrases ── */
const THINKING_PHRASES = [
  'Щас ищу в архивах…',
  'Делаю изучение…',
  'Копаюсь в базе…',
  'Считаю контейнеры…',
  'Сверяю накладные…',
  'Опрашиваю Supabase…',
  'Раскладываю по полочкам…',
  'Думаю как Шерлок…',
  'Звоню в Дубай…',
  'Прокручиваю Excel…',
  'Перебираю варианты…',
  'Минуту, додумываю…',
  'Гружу контейнер мыслей…',
  'Сверяюсь с границей…',
  'Поднимаю архивы из 2023…',
]

function ThinkingIndicator() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length))
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        let next = Math.floor(Math.random() * THINKING_PHRASES.length)
        if (next === i) next = (i + 1) % THINKING_PHRASES.length
        return next
      })
    }, 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
        <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
      </div>
      <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2 max-w-fit">
        <span
          key={idx}
          className="text-[13px] font-medium text-transparent bg-clip-text bg-[linear-gradient(110deg,#94a3b8_30%,#1e293b_50%,#94a3b8_70%)] bg-[length:200%_100%] animate-shimmer-text"
        >
          {THINKING_PHRASES[idx]}
        </span>
      </div>
    </div>
  )
}

/* ── Lightweight markdown formatter ── */
function FormattedText({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text])
  return (
    <div className="prose-sm">
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} />
      ))}
    </div>
  )
}

type Align = 'left' | 'center' | 'right'

type Block =
  | { type: 'p'; content: string }
  | { type: 'h'; level: number; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][]; align: Align[] }

/** Split a single markdown table row on `|`, respecting outer pipes. Also handles
 *  a degenerate case when the model joined several rows on one line:
 *    `| a | b | |---|---| | 1 | 2 |`. We split that back into individual rows
 *  by detecting `| |` (cell boundary touching another row's start). */
function splitTableLines(line: string): string[] {
  // Normalize: strip leading/trailing pipes, but track them by line.
  // Look for ` | |` or `||` boundaries that suggest concatenated rows.
  // Heuristic: a row separator is `| |` (with optional spaces) where the prior segment ends
  // a complete row. Easier: collapse `| |` → `|\n|` and let the regular path handle.
  // But that breaks empty cells. Better: detect specifically `||` or `| |` after a closing pipe.
  // Strategy: split into pseudo-rows by looking at `\| *\|` pattern when the line has many `|`.
  const trimmed = line.trim()
  // If only one row's worth, return as is
  // Count pipes to estimate
  if (!trimmed.includes('| |') && !trimmed.match(/\|\s*\|\s*-/)) return [trimmed]
  // Split on "| |" or "||" — these mark row boundaries
  return trimmed.split(/\|\s*\|/).map((seg, idx, arr) => {
    if (idx === 0) return seg + '|'
    if (idx === arr.length - 1) return '|' + seg
    return '|' + seg + '|'
  })
}

function parseTableRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

function isTableSeparator(line: string): boolean {
  const t = line.trim()
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(t)
}

function parseAlign(cells: string[]): Align[] {
  return cells.map((c) => {
    const t = c.trim()
    const left = t.startsWith(':')
    const right = t.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    return 'left'
  })
}

function parseMarkdown(text: string): Block[] {
  // Pre-process: if model concatenated table rows on a single line,
  // split them so the regular line-by-line parser works.
  const rawLines = text.split('\n')
  const lines: string[] = []
  for (const l of rawLines) {
    if (l.includes('|') && (l.match(/\|/g) || []).length >= 4 && (l.includes('| |') || /\|\s*\|\s*[-:]/.test(l))) {
      for (const sub of splitTableLines(l)) lines.push(sub)
    } else {
      lines.push(l)
    }
  }

  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty
    if (!line.trim()) {
      i++
      continue
    }

    // Heading
    const hMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (hMatch) {
      blocks.push({ type: 'h', level: hMatch[1].length, content: hMatch[2] })
      i++
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++
      blocks.push({ type: 'code', content: buf.join('\n') })
      continue
    }

    // Table (header line + separator)
    if (line.trim().includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line)
      const align = parseAlign(parseTableRow(lines[i + 1]))
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim().startsWith('|')) {
        const row = parseTableRow(lines[i])
        // Pad/truncate row to header length
        while (row.length < headers.length) row.push('')
        rows.push(row.slice(0, headers.length))
        i++
      }
      // Normalize align array length
      while (align.length < headers.length) align.push('left')
      blocks.push({ type: 'table', headers, rows, align: align.slice(0, headers.length) })
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Paragraph (collect until blank line OR a structural prefix)
    const buf = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s|```|\|)/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', content: buf.join(' ') })
  }

  return blocks
}

function BlockRenderer({ block }: { block: Block }) {
  if (block.type === 'h') {
    const sizes = ['text-[16px]', 'text-[15px]', 'text-[14px]']
    return (
      <p className={cn('font-bold text-slate-900 mb-1.5 mt-2 first:mt-0', sizes[block.level - 1])}>
        <Inline text={block.content} />
      </p>
    )
  }
  if (block.type === 'ul') {
    return (
      <ul className="list-disc pl-5 space-y-0.5 my-1.5">
        {block.items.map((it, i) => (
          <li key={i}>
            <Inline text={it} />
          </li>
        ))}
      </ul>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol className="list-decimal pl-5 space-y-0.5 my-1.5">
        {block.items.map((it, i) => (
          <li key={i}>
            <Inline text={it} />
          </li>
        ))}
      </ol>
    )
  }
  if (block.type === 'code') {
    return (
      <pre className="bg-slate-900 text-slate-100 rounded-lg px-3 py-2 my-2 text-[12px] font-mono overflow-x-auto">
        <code>{block.content}</code>
      </pre>
    )
  }
  if (block.type === 'table') {
    const alignClass = (a: Align) =>
      a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left'
    return (
      <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-[12px] border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-3 py-2 font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap',
                    alignClass(block.align[i] || 'left')
                  )}
                >
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      'px-3 py-2 text-slate-700 align-top',
                      alignClass(block.align[ci] || 'left')
                    )}
                  >
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <p className="my-1.5 first:mt-0 last:mb-0">
      <Inline text={block.content} />
    </p>
  )
}

/* Inline: bold, code, links — supports nested e.g. **[text](url)** */
// Match /dashboard/shipments/<uuid> and capture the id
const SHIPMENT_HREF = /^\/dashboard\/shipments\/([0-9a-f-]{8,})\/?$/i

function Inline({ text }: { text: string }) {
  const { openShipment } = useShipmentModal()

  type Tok = { type: 'text' | 'b' | 'code' | 'a'; content: string; href?: string }
  const tokens: Tok[] = []
  // Order matters: link first so [text](url) wins inside **...**.
  // We strip outer **bold** wrapping after links are pulled out.
  const regex = /(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', content: text.slice(last, m.index) })
    if (m[1]) tokens.push({ type: 'code', content: m[2] })
    else if (m[3]) tokens.push({ type: 'a', content: m[4], href: m[5] })
    else if (m[6]) tokens.push({ type: 'b', content: m[7] })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', content: text.slice(last) })

  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'b') {
          // Recursively render so links/code inside bold work
          return (
            <strong key={i} className="font-semibold">
              <Inline text={t.content} />
            </strong>
          )
        }
        if (t.type === 'code')
          return (
            <code key={i} className="px-1 py-0.5 rounded bg-slate-200/60 text-slate-700 text-[12px] font-mono">
              {t.content}
            </code>
          )
        if (t.type === 'a') {
          // Shipment links open the global modal instead of full navigation
          const m = t.href && SHIPMENT_HREF.exec(t.href)
          if (m) {
            const id = m[1]
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShipment(id) }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-[13px] cursor-pointer transition-colors"
              >
                <Hash className="w-3 h-3 opacity-70" />
                {t.content}
              </button>
            )
          }
          return (
            <a
              key={i}
              href={t.href}
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2 font-medium"
            >
              {t.content}
            </a>
          )
        }
        return <span key={i}>{t.content}</span>
      })}
    </>
  )
}
