'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Bell } from 'lucide-react'
import type { Profile } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менеджер',
  client: 'Клиент',
}

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по номеру контейнера..."
          className="w-full h-9 rounded-lg bg-slate-50 border-0 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Bell className="h-[18px] w-[18px] text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">
              {profile?.full_name || 'Загрузка...'}
            </p>
            <p className="text-[11px] text-slate-400">
              {profile ? ROLE_LABELS[profile.role] || profile.role : ''}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
