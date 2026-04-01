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
  ChevronLeft,
  Truck,
  Clock,
  CheckCircle2,
  Snowflake,
} from 'lucide-react'

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
    <div className="flex h-screen w-[250px] flex-col bg-white border-r border-slate-200/80">
      {/* Logo */}
      <div className="flex h-[56px] items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Ship className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-[15px] text-slate-900 tracking-tight">Logistics</span>
        </div>
        <button className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Core Nav */}
      <nav className="flex-1 px-3 pt-5 overflow-y-auto">
        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold px-2 mb-2">Основное</p>
        <div className="space-y-0.5">
          {coreItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] transition-all duration-150',
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.6} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Status shortcuts */}
        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400 font-semibold px-2 mb-2 mt-6">Статусы</p>
        <div className="space-y-0.5">
          {statusItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all duration-150"
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] w-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-medium transition-all duration-150"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
          Выйти
        </button>
      </div>
    </div>
  )
}
