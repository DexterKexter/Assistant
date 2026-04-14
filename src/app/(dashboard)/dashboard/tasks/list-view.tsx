'use client'

import { type Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/types/database'
import { useTaskModal } from '@/lib/task-modal'
import { fmtDate } from '@/lib/utils'
import { ArrowDown, Minus, ArrowUp, AlertTriangle, MessageSquare } from 'lucide-react'

const PRIORITY_ICONS = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
}

export function ListView({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const { openTask } = useTaskModal()

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 border-b border-slate-50" />)}
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Задача', 'Статус', 'Приоритет', 'Исполнители', 'Срок', 'Создана'].map(h => (
                <th key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-[13px] text-slate-400">Нет задач</td></tr>
            )}
            {tasks.map(task => {
              const sCfg = TASK_STATUS_CONFIG[task.status]
              const pCfg = TASK_PRIORITY_CONFIG[task.priority]
              const PIcon = PRIORITY_ICONS[task.priority]
              const assignees = task.assignees || []
              const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()

              return (
                <tr key={task.id} onClick={() => openTask(task.id)} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-medium text-slate-800">{task.title}</span>
                    {task.description && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sCfg.color }} />
                      {sCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: pCfg.color }}>
                      <PIcon className="w-3 h-3" strokeWidth={2} />
                      {pCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {assignees.length > 0 ? (
                      <div className="flex items-center">
                        <div className="flex -space-x-1.5">
                          {assignees.slice(0, 3).map(a => {
                            const name = a.profile?.full_name || ''
                            const ini = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
                            return (
                              <div key={a.user_id} className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-white" title={name}>{ini}</div>
                            )
                          })}
                          {assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-[8px] font-bold ring-2 ring-white">+{assignees.length - 3}</div>
                          )}
                        </div>
                        {assignees.length === 1 && (
                          <span className="text-[12px] text-slate-600 truncate max-w-[100px] ml-2">{assignees[0].profile?.full_name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[12px] tabular-nums ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-400 tabular-nums">{fmtDate(task.created_at?.split('T')[0])}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {tasks.length === 0 && <div className="text-center py-10 text-[13px] text-slate-400">Нет задач</div>}
        {tasks.map(task => {
          const sCfg = TASK_STATUS_CONFIG[task.status]
          const pCfg = TASK_PRIORITY_CONFIG[task.priority]
          const PIcon = PRIORITY_ICONS[task.priority]
          const assignees = task.assignees || []

          return (
            <div key={task.id} onClick={() => openTask(task.id)} className="bg-white rounded-xl border border-slate-100 p-3.5 cursor-pointer active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="text-[13px] font-semibold text-slate-800 flex-1 line-clamp-2">{task.title}</h4>
                <PIcon className="w-3.5 h-3.5 shrink-0" style={{ color: pCfg.color }} strokeWidth={2} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: sCfg.bg, color: sCfg.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sCfg.color }} />
                  {sCfg.label}
                </span>
                {assignees.length > 0 && (
                  <div className="flex -space-x-1">
                    {assignees.slice(0, 3).map(a => {
                      const name = a.profile?.full_name || ''
                      const ini = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'
                      return (
                        <div key={a.user_id} className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[7px] font-bold ring-1 ring-white">{ini}</div>
                      )
                    })}
                    {assignees.length > 3 && (
                      <div className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-slate-600 text-[7px] font-bold ring-1 ring-white">+{assignees.length - 3}</div>
                    )}
                  </div>
                )}
                {task.due_date && (
                  <span className="text-[10px] text-slate-400">{new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
