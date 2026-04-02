'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Users } from 'lucide-react'
import type { Client } from '@/types/database'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const fetchClients = async () => {
      let query = supabase.from('clients').select('*').order('name')
      if (search) query = query.ilike('name', `%${search}%`)
      const { data } = await query.limit(100)
      setClients(data || [])
      setLoading(false)
    }
    fetchClients()
  }, [search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Клиенты</h1>
        <p className="text-sm text-slate-500 mt-1">{clients.length} контактов</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по имени..."
          className="w-full h-10 rounded-xl bg-white border border-slate-200 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Клиенты не найдены</p>
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Имя</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Телефон</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Адрес</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Регион</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map((c, i) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{c.phone || '—'}</td>
                  <td className="px-6 py-3 text-sm text-slate-500 max-w-[200px] truncate">{c.address || '—'}</td>
                  <td className="px-6 py-3">
                    {c.is_russia ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700">🇷🇺 Россия</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500">🇰🇿 Казахстан</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {clients.map((c, i) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer active:bg-slate-50 transition-colors animate-fade-up"
              style={{ animationDelay: `${i * 20}ms` }}
              onClick={() => router.push(`/dashboard/clients/${c.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800 truncate">{c.name}</p>
                  <p className="text-[12px] text-slate-400">{c.phone || 'Нет телефона'}</p>
                </div>
                {c.is_russia ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 shrink-0">🇷🇺</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-500 shrink-0">🇰🇿</span>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

    </div>
  )
}
