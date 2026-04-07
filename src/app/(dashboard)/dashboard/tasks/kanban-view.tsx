'use client'

import { useState, useRef } from 'react'
import { type Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, type TaskStatus } from '@/types/database'
import { useTaskModal } from '@/lib/task-modal'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, MoreHorizontal, ArrowDown, Minus, ArrowUp, AlertTriangle, Calendar, GripVertical } from 'lucide-react'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

const PRIORITY_ICONS = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
}

// Card border colors per status
const CARD_BORDER_COLORS: Record<TaskStatus, string> = {
  todo: 'border-l-slate-400',
  in_progress: 'border-l-indigo-500',
  review: 'border-l-amber-500',
  done: 'border-l-emerald-500',
}

const CARD_BG_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-white',
  in_progress: 'bg-indigo-50/30',
  review: 'bg-amber-50/30',
  done: 'bg-emerald-50/30',
}

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (e: React.DragEvent, taskId: string) => void }) {
  const { openTask } = useTaskModal()
  const pCfg = TASK_PRIORITY_CONFIG[task.priority]
  const PIcon = PRIORITY_ICONS[task.priority]
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()
  const initials = task.assignee?.full_name
    ? task.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => openTask(task.id)}
      className="bg-white rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:shadow-lg shadow-sm transition-all group border border-slate-100/80"
    >
      {/* Priority badge */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: pCfg.color + '15', color: pCfg.color }}>
          <PIcon className="w-3 h-3" strokeWidth={2.5} />
          {pCfg.label}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-[14px] font-semibold text-slate-800 leading-snug line-clamp-2 mb-1">{task.title}</h4>

      {task.description && (
        <p className="text-[12px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
      )}

      {/* Bottom: avatars + meta */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/80">
        <div className="flex items-center gap-1.5">
          {initials && (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-white" title={task.assignee?.full_name || ''}>
              {initials}
            </div>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 text-[10px] font-medium ml-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
              <Calendar className="w-3 h-3" strokeWidth={1.8} />
              {new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(task.comment_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.8} />
              {task.comment_count}
            </span>
          )}
          <StatusDropdown task={task} />
        </div>
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
                <button key={s} onClick={(e) => { e.stopPropagation(); changeStatus(s) }}
                  className={`w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-slate-50 flex items-center gap-2 ${task.status === s ? 'text-slate-900' : 'text-slate-600'}`}>
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

export function KanbanView({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [localOverrides, setLocalOverrides] = useState<Record<string, TaskStatus>>({})
  const draggedTaskId = useRef<string | null>(null)

  // Apply local optimistic overrides to tasks
  const displayTasks = tasks.map(t => localOverrides[t.id] ? { ...t, status: localOverrides[t.id] } : t)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    draggedTaskId.current = taskId
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4'
      e.currentTarget.style.transform = 'scale(0.95)'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
      e.currentTarget.style.transform = 'scale(1)'
    }
    setDragOverColumn(null)
    draggedTaskId.current = null
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const taskId = draggedTaskId.current
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    // Optimistic: instantly move card
    setLocalOverrides(prev => ({ ...prev, [taskId]: targetStatus }))
    draggedTaskId.current = null

    // Persist to DB
    const supabase = createClient()
    await supabase.from('tasks').update({ status: targetStatus }).eq('id', taskId)

    // Clear override after real data arrives (via real-time)
    setTimeout(() => setLocalOverrides(prev => { const n = { ...prev }; delete n[taskId]; return n }), 2000)
  }

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
        const columnTasks = displayTasks.filter(t => t.status === status)
        const isDropTarget = dragOverColumn === status

        return (
          <div
            key={status}
            className="min-w-[280px] md:min-w-0 md:flex-1 snap-center flex flex-col"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3" style={{ backgroundColor: cfg.bg }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[12px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-[11px] font-medium text-slate-400 ml-auto">{columnTasks.length}</span>
            </div>

            {/* Drop zone */}
            <div
              className={`space-y-2 flex-1 md:max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5 rounded-xl transition-all ${isDropTarget ? 'bg-indigo-50/50 ring-2 ring-indigo-200 ring-dashed p-2' : 'p-0'}`}
            >
              {columnTasks.length === 0 && !isDropTarget && (
                <div className="text-center py-8 text-[11px] text-slate-300">Нет задач</div>
              )}
              {columnTasks.length === 0 && isDropTarget && (
                <div className="text-center py-8 text-[11px] text-indigo-400 font-medium">Отпустите здесь</div>
              )}
              {columnTasks.map(task => (
                <div key={task.id} onDragEnd={handleDragEnd}>
                  <TaskCard task={task} onDragStart={handleDragStart} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
