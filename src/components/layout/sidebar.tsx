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
  ClipboardList,
  Inbox,
} from 'lucide-react'
import { useProfile } from '@/lib/useProfile'
import { useUnreadCount } from '@/lib/useMessages'
import { useMyTaskCount } from '@/lib/useTasks'

const sections: { label: string | null; items: { href: string; label: string; icon: typeof Ship }[] }[] = [
  { label: null, items: [
    { href: '/dashboard', label: 'Обзор', icon: LayoutGrid },
    { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
    { href: '/dashboard/cargo-requests', label: 'Заявки на груз', icon: ClipboardList },
    { href: '/dashboard/tasks', label: 'Задачи', icon: CheckSquare },
    { href: '/dashboard/messages', label: 'Чат команды', icon: MessageSquare },
  ] },
  { label: 'Клиенты', items: [
    { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
    { href: '/dashboard/crm', label: 'CRM чаты', icon: Inbox },
  ] },
  { label: 'Учёт', items: [
    { href: '/dashboard/carriers', label: 'Перевозчики', icon: Truck },
    { href: '/dashboard/finance', label: 'Финансы', icon: Wallet },
    { href: '/dashboard/documents', label: 'Документы', icon: FileText },
    { href: '/dashboard/reports', label: 'Отчёты', icon: BarChart3 },
  ] },
]

// Roles not listed here see everything.
const ROLE_ALLOWED: Record<string, string[]> = {
  accountant: ['/dashboard/shipments', '/dashboard/clients', '/dashboard/finance', '/dashboard/messages', '/dashboard/documents', '/dashboard/tasks'],
  client: ['/dashboard/messages', '/dashboard/documents', '/dashboard/tasks'],
}

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

  const allowed = ROLE_ALLOWED[profile?.role || 'client']
  const visibleSections = sections
    .map(s => ({ ...s, items: s.items.filter(i => !allowed || allowed.includes(i.href)) }))
    .filter(s => s.items.length)

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
          {visibleSections.flatMap(s => s.items).map((item) => {
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

        </div>

        {/* Bottom: technical links, small and muted */}
        <div className="flex flex-col items-center gap-0.5 mt-2">
          {hasRole('admin') && (
            <>
              <Link href="/dashboard/admin" onClick={onNavigate} title="Админка"
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/60',
                  isActive('/dashboard/admin') ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <Shield className="w-4 h-4" strokeWidth={1.6} />
              </Link>
              <Link href="/dashboard/admin" onClick={onNavigate} title="Настройки"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-600">
                <Settings className="w-4 h-4" strokeWidth={1.6} />
              </Link>
            </>
          )}
          <button onClick={handleLogout} title="Выйти"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-600">
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
        {visibleSections.map((section, si) => (
          <div key={section.label ?? si} className={si > 0 ? 'mt-5' : ''}>
            {section.label && (
              <p className="text-[10.5px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-1.5">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-[7px] rounded-xl text-[13px]',
                      active
                        ? 'bg-white text-slate-900 font-semibold shadow-sm shadow-indigo-200/50'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium'
                    )}>
                    <item.icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'text-indigo-500' : 'text-slate-400')} strokeWidth={active ? 2.2 : 1.7} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/dashboard/messages' && unreadCount > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {item.href === '/dashboard/tasks' && taskCount > 0 && (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {taskCount > 9 ? '9+' : taskCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Technical links: small and muted, pinned to the bottom */}
      <div className="pl-4 pr-16 pb-4 pt-3 space-y-px">
        {hasRole('admin') && (
          <>
            <Link href="/dashboard/admin" onClick={onNavigate}
              className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] hover:bg-white/60',
                isActive('/dashboard/admin') ? 'text-slate-700 font-medium' : 'text-slate-400 hover:text-slate-600')}>
              <Shield className="h-[14px] w-[14px] shrink-0" strokeWidth={1.7} />
              Админка
            </Link>
            <Link href="/dashboard/admin" onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] text-slate-400 hover:text-slate-600 hover:bg-white/60">
              <Settings className="h-[14px] w-[14px] shrink-0" strokeWidth={1.7} />
              Настройки
            </Link>
          </>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] w-full text-slate-400 hover:text-slate-600 hover:bg-white/60">
          <LogOut className="h-[14px] w-[14px] shrink-0" strokeWidth={1.7} />
          Выйти
        </button>
      </div>
    </div>
  )
}
