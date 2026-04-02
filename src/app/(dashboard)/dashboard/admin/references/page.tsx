'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/useProfile'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, Trash2, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface RefItem {
  id: string
  category: string
  name: string
  created_at: string
}

const CATEGORIES = [
  { key: 'city', label: 'Города' },
  { key: 'station', label: 'Погранпереходы' },
  { key: 'cargo', label: 'Грузы (наименования)' },
  { key: 'sender', label: 'Отправители' },
]

export default function ReferencesPage() {
  const { loading: meLoading, hasRole } = useProfile()
  const router = useRouter()
  const [items, setItems] = useState<RefItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('city')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!meLoading && !hasRole('admin', 'manager')) {
      router.replace('/dashboard')
    }
  }, [meLoading, hasRole, router])

  useEffect(() => {
    if (!meLoading && hasRole('admin', 'manager')) fetchItems()
  }, [meLoading])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('reference_items')
      .select('*')
      .order('name')
    setItems((data as RefItem[]) || [])
    setLoading(false)
  }

  const filtered = items
    .filter(i => i.category === activeCategory)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('reference_items')
      .insert({ category: activeCategory, name: newName.trim() })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data as RefItem])
    }
    setNewName('')
    setAdding(false)
    setSaving(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    await supabase.from('reference_items').update({ name: editName.trim() }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i))
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('reference_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (meLoading || (!hasRole('admin', 'manager') && !meLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const catCounts = CATEGORIES.map(c => ({
    ...c,
    count: items.filter(i => i.category === c.key).length,
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin" className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 font-heading">Справочники</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{items.length} записей в {CATEGORIES.length} категориях</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Categories sidebar */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 h-fit">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider px-2 mb-2">Категории</p>
          <div className="space-y-0.5">
            {catCounts.map(c => (
              <button
                key={c.key}
                onClick={() => { setActiveCategory(c.key); setSearch(''); setAdding(false); setEditingId(null) }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all ${
                  activeCategory === c.key
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{c.label}</span>
                <span className={`text-[11px] font-medium shrink-0 ml-2 ${
                  activeCategory === c.key ? 'text-indigo-500' : 'text-slate-400'
                }`}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-[14px] font-semibold text-slate-900 font-heading">
              {CATEGORIES.find(c => c.key === activeCategory)?.label}
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-8 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all w-48"
                />
              </div>
              <button
                onClick={() => { setAdding(true); setNewName('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-[12px] font-medium hover:bg-indigo-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-8 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Add new row */}
              {adding && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50/30">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Название..."
                    autoFocus
                    className="flex-1 text-[13px] border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                  />
                  <button onClick={handleAdd} disabled={saving || !newName.trim()} className="w-7 h-7 rounded-md bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setAdding(false)} className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {filtered.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-5 py-2 hover:bg-slate-50/40 transition-colors group">
                  {editingId === item.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEdit(item.id)}
                        autoFocus
                        className="flex-1 text-[13px] border border-slate-200 rounded-md px-2.5 py-1 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                      />
                      <button onClick={() => handleEdit(item.id)} disabled={saving} className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-[13px] text-slate-700">{item.name}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(item.id); setEditName(item.name) }} className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
                          <Pencil className="w-3 h-3 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {filtered.length === 0 && !adding && (
                <div className="py-8 text-center text-[13px] text-slate-400">
                  {search ? 'Ничего не найдено' : 'Пусто — добавьте первую запись'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
