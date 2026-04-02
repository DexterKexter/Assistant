'use client'

import { useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  CheckCircle2,
  Shield,
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { hasRole } = useProfile()
  const [collapsed, setCollapsed] = useState(false)

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

  return (
    <div className={cn(
      'relative flex h-screen flex-col bg-white border-r border-slate-200/80 transition-all duration-200 shrink-0 overflow-visible',
      collapsed ? 'w-[68px]' : 'w-[250px]'
    )}>
      {/* Logo */}
      <div className="relative flex h-[56px] items-center px-4 border-b border-slate-100">
        <div className={cn('flex items-center gap-2.5 overflow-hidden w-full', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <Ship className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="font-heading font-bold text-[15px] text-slate-900 tracking-tight whitespace-nowrap">Logistics</span>}
        </div>
        {/* Toggle button on sidebar edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 shadow-sm transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronLeft className="w-3 h-3 text-slate-400" />}
        </button>
      </div>

      {/* Core Nav */}
      <nav className="flex-1 px-2 pt-5 overflow-y-auto">
        {!collapsed && <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold px-2 mb-2">Основное</p>}
        <div className="space-y-0.5">
          {coreItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-lg transition-all duration-150',
                  collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-[7px]',
                  'text-[14px]',
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.6} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </div>

        {/* Status shortcuts */}
        {!collapsed && <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold px-2 mb-2 mt-6">Статусы</p>}
        {collapsed && <div className="my-3 mx-2 h-px bg-slate-100" />}
        <div className="space-y-0.5">
          {statusItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-[14px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all duration-150',
                collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-[7px]'
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
              {!collapsed && item.label}
            </Link>
          ))}
        </div>

        {/* Admin */}
        {hasRole('admin') && (
          <>
            {!collapsed && <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold px-2 mb-2 mt-6">Управление</p>}
            {collapsed && <div className="my-3 mx-2 h-px bg-slate-100" />}
            <div className="space-y-0.5">
              <Link
                href="/dashboard/admin"
                title={collapsed ? 'Админка' : undefined}
                className={cn(
                  'flex items-center rounded-lg text-[14px] transition-all duration-150',
                  collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-[7px]',
                  isActive('/dashboard/admin')
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'
                )}
              >
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive('/dashboard/admin') ? 2.2 : 1.6} />
                {!collapsed && 'Админка'}
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-slate-100 pt-3">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Выйти' : undefined}
          className={cn(
            'flex items-center rounded-lg text-[14px] w-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-medium transition-all duration-150',
            collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-[7px]'
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
          {!collapsed && 'Выйти'}
        </button>
      </div>
    </div>
  )
}
