'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface RefItem {
  id: string
  category: string
  name: string
  created_at: string
}

const CATEGORIES = [
  { key: 'city', label: 'Города' },
  { key: 'station', label: 'Погранпереходы' },
  { key: 'cargo', label: 'Грузы' },
  { key: 'sender', label: 'Отправители' },
]

export function ReferencesModal({ onClose }: { onClose: () => void }) {
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
    supabase.from('reference_items').select('*').order('name')
      .then(({ data }) => { setItems((data as RefItem[]) || []); setLoading(false) })
  }, [])

  const filtered = items
    .filter(i => i.category === activeCategory)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('reference_items')
      .insert({ category: activeCategory, name: newName.trim() })
      .select().single()
    if (!error && data) setItems(prev => [...prev, data as RefItem])
    setNewName(''); setAdding(false); setSaving(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    await supabase.from('reference_items').update({ name: editName.trim() }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i))
    setEditingId(null); setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('reference_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const catCounts = CATEGORIES.map(c => ({ ...c, count: items.filter(i => i.category === c.key).length }))

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f8fafc] rounded-2xl w-[95vw] max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 font-heading">Справочники</h2>
            <p className="text-[12px] text-slate-400">{items.length} записей в {CATEGORIES.length} категориях</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories */}
          <div className="w-[200px] border-r border-slate-100 bg-white p-3 shrink-0 overflow-y-auto">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider px-2 mb-2">Категории</p>
            {catCounts.map(c => (
              <button key={c.key}
                onClick={() => { setActiveCategory(c.key); setSearch(''); setAdding(false); setEditingId(null) }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5 ${
                  activeCategory === c.key ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{c.label}</span>
                <span className={`text-[11px] font-medium shrink-0 ml-2 ${activeCategory === c.key ? 'text-indigo-500' : 'text-slate-400'}`}>{c.count}</span>
              </button>
            ))}
          </div>

          {/* Items */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white shrink-0">
              <h3 className="text-[13px] font-semibold text-slate-900">{CATEGORIES.find(c => c.key === activeCategory)?.label}</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
                    className="h-7 rounded-md bg-slate-50 border border-slate-200/60 pl-7 pr-2 text-[14px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all w-36" />
                </div>
                <button onClick={() => { setAdding(true); setNewName('') }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500 text-white rounded-md text-[11px] font-medium hover:bg-indigo-600 transition-colors">
                  <Plus className="w-3 h-3" /> Добавить
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {adding && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/30">
                      <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Название..." autoFocus
                        className="flex-1 text-[12px] border border-slate-200 rounded-md px-2 py-1 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      <button onClick={handleAdd} disabled={saving || !newName.trim()} className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setAdding(false)} className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  {filtered.map(item => (
                    <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-indigo-50/60 transition-colors group">
                      {editingId === item.id ? (
                        <>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleEdit(item.id)} autoFocus
                            className="flex-1 text-[12px] border border-slate-200 rounded-md px-2 py-1 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          <button onClick={() => handleEdit(item.id)} disabled={saving} className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-50"><Check className="w-2.5 h-2.5" /></button>
                          <button onClick={() => setEditingId(null)} className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50"><X className="w-2.5 h-2.5" /></button>
                        </>
                      ) : (
                        <>
                          <p className="flex-1 text-[14px] text-slate-700">{item.name}</p>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(item.id); setEditName(item.name) }} className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center"><Pencil className="w-2.5 h-2.5 text-slate-400" /></button>
                            <button onClick={() => handleDelete(item.id)} className="w-5 h-5 rounded hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-2.5 h-2.5 text-red-400" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {filtered.length === 0 && !adding && (
                    <div className="py-8 text-center text-[12px] text-slate-400">{search ? 'Ничего не найдено' : 'Пусто'}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
