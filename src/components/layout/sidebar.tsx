'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutGrid,
  Ship,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  BarChart3,
  LogOut,
  Truck,
  Clock,
  CheckCircle2,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  CheckSquare,
} from 'lucide-react'
import { useProfile } from '@/lib/useProfile'
import { useUnreadCount } from '@/lib/useMessages'
import { useMyTaskCount } from '@/lib/useTasks'

const mainItems = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutGrid },
  { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
  { href: '/dashboard/reports', label: 'Отчёты', icon: BarChart3 },
]

const businessItems = [
  { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
  { href: '/dashboard/carriers', label: 'Перевозчики', icon: Truck },
  { href: '/dashboard/finance', label: 'Финансы', icon: Wallet },
]

const otherItems = [
  { href: '/dashboard/messages', label: 'Сообщения', icon: MessageSquare },
  { href: '/dashboard/documents', label: 'Документы', icon: FileText },
  { href: '/dashboard/tasks', label: 'Задачи', icon: CheckSquare },
]

// Combined for collapsed view
const coreItems = [...mainItems, ...businessItems, ...otherItems]

const statusItems = [
  { href: '/dashboard/shipments?status=in_transit', label: 'В пути', icon: Truck },
  { href: '/dashboard/shipments?status=arrived', label: 'На границе', icon: Clock },
  { href: '/dashboard/shipments?status=delivered', label: 'Доставлено', icon: CheckCircle2 },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  client: 'Клиент',
}

interface SidebarProps {
  onNavigate?: () => void
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ onNavigate, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, hasRole } = useProfile()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href.includes('?')) return false
    return pathname.startsWith(href)
  }

  const unreadCount = useUnreadCount()
  const taskCount = useMyTaskCount()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  /* ── Collapsed view ── */
  if (collapsed) {
    return (
      <div
        className="flex h-screen w-[80px] flex-col shrink-0 items-center py-4 gap-1 pr-4"
        style={{
          backgroundColor: '#f8f9fb',
          backgroundImage: 'radial-gradient(ellipse at 20% 15%, rgba(199,210,254,0.45) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, rgba(221,210,255,0.3) 0%, transparent 50%)',
        }}
      >
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md mb-2">
          <Ship className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
        </div>

        {/* Expand */}
        <button onClick={onToggle} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/60 mb-2">
          <PanelLeftOpen className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
        </button>

        {/* Nav icons */}
        <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {(() => {
            const role = profile?.role || 'client'
            if (role === 'accountant') return [...businessItems.filter(i => ['/dashboard/finance', '/dashboard/documents'].includes(i.href)), ...otherItems]
            if (role === 'client') return otherItems
            return coreItems
          })().map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center relative',
                  active
                    ? 'bg-white shadow-sm shadow-indigo-200/50 text-slate-900'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                )}
              >
                <item.icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.6} />
                {item.href === '/dashboard/messages' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {item.href === '/dashboard/tasks' && taskCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {taskCount > 9 ? '9+' : taskCount}
                  </span>
                )}
              </Link>
            )
          })}

          {hasRole('admin') && (
            <>
              <div className="w-6 h-px bg-slate-300/40 my-2" />
              <Link
                href="/dashboard/admin"
                onClick={onNavigate}
                title="Админка"
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isActive('/dashboard/admin')
                    ? 'bg-white shadow-sm shadow-indigo-200/50 text-slate-900'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                )}
              >
                <Shield className="w-[18px] h-[18px]" strokeWidth={isActive('/dashboard/admin') ? 2.2 : 1.6} />
              </Link>
              <Link href="/dashboard/admin" onClick={onNavigate} title="Настройки"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/60 hover:text-slate-800">
                <Settings className="w-[18px] h-[18px]" strokeWidth={1.6} />
              </Link>
            </>
          )}
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <button onClick={handleLogout} title="Выйти"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-600">
            <LogOut className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    )
  }

  /* ── Expanded view ── */
  return (
    <div
      className="flex h-screen w-[240px] flex-col shrink-0 overflow-hidden pl-2"
      style={{
        backgroundColor: '#f8f9fb',
        backgroundImage: 'radial-gradient(ellipse at 20% 15%, rgba(199,210,254,0.45) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, rgba(221,210,255,0.3) 0%, transparent 50%)',
      }}
    >
      <div className="flex h-[64px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
            <Ship className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-[16px] text-slate-900 tracking-tight">Logistics</span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="w-7 h-7 rounded-lg border border-slate-200/80 bg-white/80 flex items-center justify-center hover:bg-white shadow-sm">
            <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <nav className="flex-1 pl-4 pr-16 pt-2 overflow-y-auto">
        {(() => {
          const role = profile?.role || 'client'
          const isAccountant = role === 'accountant'
          const isClient = role === 'client'
          const sections = []

          if (!isAccountant && !isClient) {
            sections.push({ label: 'Основное', items: mainItems })
            sections.push({ label: 'Бизнес', items: businessItems })
          }
          if (isAccountant) {
            sections.push({ label: 'Бизнес', items: businessItems.filter(i => ['/dashboard/finance', '/dashboard/documents'].includes(i.href)) })
          }
          sections.push({ label: isAccountant || isClient ? 'Меню' : 'Другое', items: otherItems })

          return sections
        })().map((section, si) => (
          <div key={section.label}>
            <p className={`text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-2 ${si > 0 ? 'mt-5' : ''}`}>{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 rounded-xl text-[13px]',
                      active
                        ? 'bg-white text-slate-900 font-semibold shadow-sm shadow-indigo-200/50'
                        : 'text-slate-800 hover:bg-white/60 hover:text-slate-900 font-semibold'
                    )}>
                    <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.6} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/dashboard/messages' && unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {item.href === '/dashboard/tasks' && taskCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {taskCount > 9 ? '9+' : taskCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {hasRole('admin') && (
          <>
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-2 mt-6">Управление</p>
            <div className="space-y-0.5">
              <Link href="/dashboard/admin" onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-xl text-[13px]',
                  isActive('/dashboard/admin')
                    ? 'bg-white text-slate-900 font-semibold shadow-sm shadow-indigo-200/50'
                    : 'text-slate-800 hover:bg-white/60 hover:text-slate-900 font-semibold'
                )}>
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive('/dashboard/admin') ? 2.2 : 1.6} />
                Админка
              </Link>
              <Link href="/dashboard/admin" onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] text-slate-800 hover:bg-white/60 hover:text-slate-900 font-semibold">
                <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                Настройки
              </Link>
            </div>
          </>
        )}
      </nav>

      <div className="px-4 pb-4 pt-3">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] w-full text-slate-400 hover:text-slate-600 hover:bg-white/60 font-medium">
          <LogOut className="h-[16px] w-[16px] shrink-0" strokeWidth={1.6} />
          Выйти
        </button>
      </div>
    </div>
  )
}
