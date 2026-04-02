'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { useRouter } from 'next/navigation'
import type { Profile, UserRole } from '@/types/database'
import { Shield, Users, ChevronDown, Check, Search, UserPlus, Calculator, BookOpen } from 'lucide-react'
import Link from 'next/link'

const ALL_ROLES: UserRole[] = ['admin', 'manager', 'accountant', 'client']

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  client: 'Клиент',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-50 text-red-600 border-red-100',
  manager: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  accountant: 'bg-amber-50 text-amber-600 border-amber-100',
  client: 'bg-slate-50 text-slate-600 border-slate-100',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Полный доступ ко всем разделам и управлению пользователями',
  manager: 'Доступ ко всем перевозкам, клиентам, финансам и документам',
  accountant: 'Доступ к финансам, клиентам и документам',
  client: 'Только свои перевозки и документы',
}

export default function AdminPage() {
  const { profile: me, loading: meLoading, hasRole } = useProfile()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)

  // Redirect non-admin
  useEffect(() => {
    if (!meLoading && !hasRole('admin')) {
      router.replace('/dashboard')
    }
  }, [meLoading, hasRole, router])

  useEffect(() => {
    if (!meLoading && hasRole('admin')) {
      fetchUsers()
    }
  }, [meLoading])

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers((data as Profile[]) || [])
    setLoading(false)
  }

  const changeRole = async (userId: string, newRole: UserRole) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    setEditingId(null)
    setSaving(false)
  }

  if (meLoading || (!hasRole('admin') && !meLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 font-heading">Управление пользователями</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{users.length} пользователей в системе</p>
        </div>
      </div>

      {/* Role cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {ALL_ROLES.map((role) => (
          <div key={role} className="bg-white rounded-xl border border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                role === 'admin' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                role === 'manager' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' :
                role === 'accountant' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>
                {role === 'admin' ? <Shield className="w-4 h-4 text-white" strokeWidth={2} /> :
                 role === 'manager' ? <Users className="w-4 h-4 text-white" strokeWidth={2} /> :
                 role === 'accountant' ? <Calculator className="w-4 h-4 text-white" strokeWidth={2} /> :
                 <UserPlus className="w-4 h-4 text-white" strokeWidth={2} />}
              </div>
              <div>
                <p className="text-[17px] font-bold text-slate-900 font-heading">{roleCounts[role] || 0}</p>
                <p className="text-[12px] text-slate-400">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions table — collapsible */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <button
          onClick={() => setMatrixOpen(!matrixOpen)}
          className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
        >
          <h2 className="text-[14px] font-semibold text-slate-900 font-heading">Матрица доступа</h2>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${matrixOpen ? 'rotate-180' : ''}`} />
        </button>
        {matrixOpen && (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left py-2.5 px-5 text-slate-400 font-medium">Раздел</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="text-center py-2.5 px-3 text-slate-400 font-medium">{ROLE_LABELS[role]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { section: 'Обзор (Dashboard)', admin: true, manager: true, accountant: false, client: true },
                  { section: 'Все перевозки', admin: true, manager: true, accountant: false, client: false },
                  { section: 'Свои перевозки', admin: true, manager: true, accountant: false, client: true },
                  { section: 'Клиенты', admin: true, manager: true, accountant: true, client: false },
                  { section: 'Финансы', admin: true, manager: true, accountant: true, client: false },
                  { section: 'Документы (все)', admin: true, manager: true, accountant: true, client: false },
                  { section: 'Документы (свои)', admin: true, manager: true, accountant: true, client: true },
                  { section: 'Создание/редактирование', admin: true, manager: true, accountant: false, client: false },
                  { section: 'Админка', admin: true, manager: false, accountant: false, client: false },
                ].map((row) => (
                  <tr key={row.section} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-5 text-slate-700">{row.section}</td>
                    {ALL_ROLES.map((role) => (
                      <td key={role} className="text-center py-2 px-3">
                        {row[role] ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-emerald-50 items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900 font-heading">Пользователи</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all w-56"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-2.5 px-5 text-slate-400 font-medium">Имя</th>
                  <th className="text-left py-2.5 px-4 text-slate-400 font-medium">Email</th>
                  <th className="text-left py-2.5 px-4 text-slate-400 font-medium">Телефон</th>
                  <th className="text-left py-2.5 px-4 text-slate-400 font-medium">Роль</th>
                  <th className="text-left py-2.5 px-4 text-slate-400 font-medium">Создан</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const initials = user.full_name
                    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '??'
                  const isMe = user.id === me?.id
                  const isEditing = editingId === user.id

                  return (
                    <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                      <td className="py-2.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="text-slate-800 font-medium">{user.full_name || '—'}</span>
                            {isMe && <span className="ml-1.5 text-[10px] text-indigo-500 font-medium">(вы)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{user.email || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{user.phone || '—'}</td>
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {ALL_ROLES.map((role) => (
                              <button
                                key={role}
                                disabled={saving}
                                onClick={() => changeRole(user.id, role)}
                                className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${
                                  user.role === role
                                    ? ROLE_COLORS[role]
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {ROLE_LABELS[role]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => !isMe && setEditingId(user.id)}
                            disabled={isMe}
                            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${ROLE_COLORS[user.role]} ${
                              isMe ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                            }`}
                          >
                            {ROLE_LABELS[user.role]}
                            {!isMe && <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Пользователи не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
