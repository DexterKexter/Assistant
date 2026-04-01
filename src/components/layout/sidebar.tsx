'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Ship,
  Users,
  DollarSign,
  FileText,
  LogOut,
  Building2,
  UserCircle,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { href: '/dashboard/shipments', label: 'Перевозки', icon: Ship },
  { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
  { href: '/dashboard/finance', label: 'Финансы', icon: DollarSign },
  { href: '/dashboard/documents', label: 'Документы', icon: FileText },
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

  return (
    <div className="flex h-screen w-[240px] flex-col bg-[#0f172a] text-slate-400">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Ship className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-[15px] text-white tracking-tight">Logistics</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-3 font-medium">Меню</p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] w-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-200"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Выйти
        </button>
      </div>
    </div>
  )
}
