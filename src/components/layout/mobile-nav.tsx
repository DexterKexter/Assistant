'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Ship, Users, Wallet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutGrid },
  { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
  { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
  { href: '/dashboard/finance', label: 'Финансы', icon: Wallet },
  { href: '/dashboard/documents', label: 'Документы', icon: FileText },
]

export function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                active
                  ? 'text-indigo-600'
                  : 'text-slate-400 active:text-slate-600'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                active
                  ? 'bg-indigo-50 shadow-sm shadow-indigo-500/10'
                  : ''
              )}>
                <item.icon className={cn('w-[18px] h-[18px]', active && 'text-indigo-600')} strokeWidth={active ? 2.2 : 1.6} />
              </div>
              <span className={cn(
                'text-[10px] leading-tight',
                active ? 'font-semibold text-indigo-600' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
