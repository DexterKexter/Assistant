'use client'

import { type Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, type TaskStatus } from '@/types/database'
import { useTaskModal } from '@/lib/task-modal'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, MoreHorizontal, ArrowDown, Minus, ArrowUp, AlertTriangle, Calendar } from 'lucide-react'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

const PRIORITY_ICONS = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
}

function TaskCard({ task }: { task: Task }) {
  const { openTask } = useTaskModal()
  const pCfg = TASK_PRIORITY_CONFIG[task.priority]
  const PIcon = PRIORITY_ICONS[task.priority]

  const isOverdue = task.due_date && !['done'].includes(task.status) && new Date(task.due_date) < new Date()

  const initials = task.assignee?.full_name
    ? task.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div
      onClick={() => openTask(task.id)}
      className="bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">{task.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <PIcon className="w-3.5 h-3.5" style={{ color: pCfg.color }} strokeWidth={2} />
          <StatusDropdown task={task} />
        </div>
      </div>

      {task.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {initials && (
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold" title={task.assignee?.full_name || ''}>
              {initials}
            </div>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
              <Calendar className="w-3 h-3" strokeWidth={1.8} />
              {new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
        {(task.comment_count ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <MessageSquare className="w-3 h-3" strokeWidth={1.8} />
            {task.comment_count}
          </span>
        )}
      </div>
    </div>
  )
}

function StatusDropdown({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)

  const changeStatus = async (status: TaskStatus) => {
    setOpen(false)
    const supabase = createClient()
    await supabase.from('tasks').update({ status }).eq('id', task.id)
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 top-7 z-50 w-40 bg-white rounded-xl border border-slate-100 shadow-lg py-1">
            {STATUS_ORDER.map(s => {
              const cfg = TASK_STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); changeStatus(s) }}
                  className={`w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-slate-50 flex items-center gap-2 ${task.status === s ? 'text-slate-900' : 'text-slate-600'}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'

export function KanbanView({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUS_ORDER.map(s => (
          <div key={s} className="min-w-[280px] md:min-w-0 md:flex-1">
            <div className="skeleton h-10 rounded-xl mb-3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-1 px-1">
      {STATUS_ORDER.map(status => {
        const cfg = TASK_STATUS_CONFIG[status]
        const columnTasks = tasks.filter(t => t.status === status)

        return (
          <div key={status} className="min-w-[280px] md:min-w-0 md:flex-1 snap-center flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3" style={{ backgroundColor: cfg.bg }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[12px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-[11px] font-medium text-slate-400 ml-auto">{columnTasks.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2 flex-1 md:max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-[11px] text-slate-300">Нет задач</div>
              )}
              {columnTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
