'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid, Ship, Users, CheckSquare, MessageSquare,
  Menu as MenuIcon, X, BarChart3, Truck, Wallet, FileText,
  Shield, Settings, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadCount } from '@/lib/useMessages'
import { useMyTaskCount } from '@/lib/useTasks'
import { useProfile } from '@/lib/useProfile'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutGrid },
  { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
  { href: '/dashboard/tasks', label: 'Задачи', icon: CheckSquare },
  { href: '/dashboard/documents', label: 'Документы', icon: FileText },
  { href: '/dashboard/messages', label: 'Чат', icon: MessageSquare },
]

const menuSections = [
  {
    label: 'Разделы',
    items: [
      { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
      { href: '/dashboard/carriers', label: 'Перевозчики', icon: Truck },
      { href: '/dashboard/finance', label: 'Финансы', icon: Wallet },
      { href: '/dashboard/reports', label: 'Отчёты', icon: BarChart3 },
    ],
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const unreadCount = useUnreadCount()
  const taskCount = useMyTaskCount()
  const { hasRole } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <nav data-mobile-nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 rounded-[28px] bg-gradient-to-br from-indigo-50/40 via-white/30 to-violet-50/40 backdrop-blur-[24px] backdrop-saturate-200 border border-white/50 shadow-[0_12px_40px_-4px_rgba(79,70,229,0.18),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.7),inset_0_-1px_0_0_rgba(255,255,255,0.2)]">
        <div className="flex items-center justify-around px-1.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {items.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="group flex items-center justify-center px-1.5 py-0.5 transition-all min-w-[44px]"
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative',
                  active
                    ? 'bg-indigo-600 shadow-md shadow-indigo-500/25'
                    : 'group-active:bg-slate-100 group-active:scale-95'
                )}>
                  <item.icon
                    className={cn('w-[19px] h-[19px] transition-colors', active ? 'text-white' : 'text-slate-500')}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  {item.href === '/dashboard/messages' && unreadCount > 0 && (
                    <span className={cn(
                      'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white',
                      active ? 'bg-rose-500' : 'bg-indigo-500'
                    )}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                  {item.href === '/dashboard/tasks' && taskCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">{taskCount > 9 ? '9+' : taskCount}</span>
                  )}
                </div>
              </Link>
            )
          })}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Меню"
            className="group flex items-center justify-center px-1.5 py-0.5 transition-all min-w-[44px]"
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
              menuOpen
                ? 'bg-indigo-600 shadow-md shadow-indigo-500/25'
                : 'group-active:bg-slate-100 group-active:scale-95'
            )}>
              <MenuIcon
                className={cn('w-[19px] h-[19px] transition-colors', menuOpen ? 'text-white' : 'text-slate-500')}
                strokeWidth={menuOpen ? 2.4 : 1.8}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Bottom sheet menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <div
            className="absolute bottom-3 left-3 right-3 rounded-[28px] bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 backdrop-blur-[24px] backdrop-saturate-200 border border-white/60 shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8),inset_0_-1px_0_0_rgba(255,255,255,0.2)] animate-in slide-in-from-bottom duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300/70" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <h3 className="text-[15px] font-bold text-slate-900 font-heading">Меню</h3>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/50 active:bg-white/80 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="px-3 pb-2">
              {menuSections.map((section) => (
                <div key={section.label} className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">{section.label}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] transition-colors',
                            active
                              ? 'bg-indigo-500/15 text-indigo-600 font-semibold shadow-sm shadow-indigo-500/10'
                              : 'text-slate-700 active:bg-white/60 font-medium'
                          )}
                        >
                          <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}

              {hasRole('admin') && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Управление</p>
                  <div className="space-y-0.5">
                    <Link
                      href="/dashboard/admin"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors',
                        isActive('/dashboard/admin')
                          ? 'bg-indigo-50 text-indigo-600 font-semibold'
                          : 'text-slate-700 active:bg-slate-100 font-medium'
                      )}
                    >
                      <Shield className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive('/dashboard/admin') ? 2.2 : 1.8} />
                      <span>Админка</span>
                    </Link>
                    <Link
                      href="/dashboard/admin/references"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] text-slate-700 active:bg-white/60 font-medium"
                    >
                      <Settings className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                      <span>Справочники</span>
                    </Link>
                  </div>
                </div>
              )}

              <div className="border-t border-white/60 pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] text-red-500 active:bg-red-500/10 font-medium"
                >
                  <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
