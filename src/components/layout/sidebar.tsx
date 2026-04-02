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
  LogOut,
  Truck,
  Clock,
  CheckCircle2,
  Shield,
  Settings,
} from 'lucide-react'
import { useProfile } from '@/lib/useProfile'

const coreItems = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutGrid },
  { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
  { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
  { href: '/dashboard/finance', label: 'Финансы', icon: Wallet },
  { href: '/dashboard/documents', label: 'Документы', icon: FileText },
]

const statusItems = [
  { href: '/dashboard/shipments?status=in_transit', label: 'В пути', icon: Truck },
  { href: '/dashboard/shipments?status=arrived', label: 'На границе', icon: Clock },
  { href: '/dashboard/shipments?status=delivered', label: 'Доставлено', icon: CheckCircle2 },
]

interface SidebarProps {
  onNavigate?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  client: 'Клиент',
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
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

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div className="flex h-screen w-[260px] flex-col bg-[#f4f5f7] shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="flex h-[64px] items-center px-5 gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
          <Ship className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-heading font-bold text-[16px] text-slate-900 tracking-tight">Logistics</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-2">Основное</p>
        <div className="space-y-0.5">
          {coreItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-150',
                  active
                    ? 'bg-white text-slate-900 font-semibold shadow-sm shadow-slate-200/60'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-medium'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.6} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Status shortcuts */}
        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-2 mt-6">Статусы</p>
        <div className="space-y-0.5">
          {statusItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-slate-500 hover:bg-white/60 hover:text-slate-700 font-medium transition-all duration-150"
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Admin */}
        {hasRole('admin') && (
          <>
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold px-3 mb-2 mt-6">Управление</p>
            <div className="space-y-0.5">
              <Link
                href="/dashboard/admin"
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-150',
                  isActive('/dashboard/admin')
                    ? 'bg-white text-slate-900 font-semibold shadow-sm shadow-slate-200/60'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 font-medium'
                )}
              >
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive('/dashboard/admin') ? 2.2 : 1.6} />
                Админка
              </Link>
              <Link
                href="/dashboard/admin"
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] text-slate-500 hover:bg-white/60 hover:text-slate-700 font-medium transition-all duration-150"
              >
                <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                Настройки
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Account section at bottom */}
      <div className="px-3 pb-4 pt-3">
        {/* Profile card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{profile?.full_name || '...'}</p>
            <p className="text-[11px] text-slate-400 leading-tight">{profile ? ROLE_LABELS[profile.role] || profile.role : ''}</p>
          </div>
        </div>
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] w-full text-slate-400 hover:text-slate-600 hover:bg-white/60 font-medium transition-all duration-150"
        >
          <LogOut className="h-[16px] w-[16px] shrink-0" strokeWidth={1.6} />
          Выйти
        </button>
      </div>
    </div>
  )
}
