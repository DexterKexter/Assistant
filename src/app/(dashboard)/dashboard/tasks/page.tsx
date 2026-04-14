'use client'

import { useState, useMemo } from 'react'
import { useTasks } from '@/lib/useTasks'
import { useTaskModal } from '@/lib/task-modal'
import { type TaskStatus, type TaskPriority, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/types/database'
import { KanbanView } from './kanban-view'
import { ListView } from './list-view'
import { Search, Plus, LayoutGrid, List, Filter } from 'lucide-react'

export default function TasksPage() {
  const { tasks, loading } = useTasks()
  const { createTask } = useTaskModal()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')

  const filtered = useMemo(() => {
    let result = tasks
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignee?.full_name?.toLowerCase().includes(q) ||
        t.assignees?.some(a => a.profile?.full_name?.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter)
    return result
  }, [tasks, search, statusFilter, priorityFilter])

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks])

  const selCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Задачи</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {stats.total} задач · {stats.in_progress} в работе · {stats.done} выполнено
          </p>
        </div>
        <button onClick={createTask} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Новая задача</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | TaskStatus)} className={selCls}>
          <option value="all">Все статусы</option>
          {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map(s => (
            <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'all' | TaskPriority)} className={selCls}>
          <option value="all">Все приоритеты</option>
          {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
            <option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>
          ))}
        </select>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setView('kanban')}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* View */}
      {view === 'kanban' ? (
        <KanbanView tasks={filtered} loading={loading} />
      ) : (
        <ListView tasks={filtered} loading={loading} />
      )}
    </div>
  )
}
