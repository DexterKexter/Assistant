'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Bell, ChevronRight } from 'lucide-react'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  client: 'Клиент',
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Обзор',
  '/dashboard/shipments': 'Перевозки',
  '/dashboard/clients': 'Клиенты',
  '/dashboard/finance': 'Финансы',
  '/dashboard/documents': 'Документы',
}

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const pageTitle = PAGE_TITLES[pathname] || ''

  return (
    <header className="flex h-[56px] items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-6">
      {/* Search — takes available space */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по номеру контейнера..."
          className="w-full h-9 rounded-lg bg-slate-50 border border-slate-200/60 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification */}
        <button className="relative w-9 h-9 rounded-lg border border-slate-200/60 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
          <Bell className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-100" />

        {/* Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight">
              {profile?.full_name || '...'}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {profile ? ROLE_LABELS[profile.role] || profile.role : ''}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
