'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTaskModal } from '@/lib/task-modal'
import { useTaskComments } from '@/lib/useTasks'
import { useProfile } from '@/lib/useProfile'
import { type Task, type TaskStatus, type TaskPriority, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, type Profile } from '@/types/database'
import { X, Trash2, Send, ArrowDown, Minus, ArrowUp, AlertTriangle, Link, User, CheckCircle, Calendar } from 'lucide-react'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
const PRIORITY_ORDER: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const PRIORITY_ICONS = { low: ArrowDown, medium: Minus, high: ArrowUp, urgent: AlertTriangle }

export default function TaskDetailSheet() {
  const { selectedTaskId, isCreating, closeTask } = useTaskModal()
  const { profile } = useProfile()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])

  // Create mode state
  const [createTitle, setCreateTitle] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createPriority, setCreatePriority] = useState<TaskPriority>('medium')
  const [createAssignee, setCreateAssignee] = useState('')
  const [createDue, setCreateDue] = useState('')

  // Comment
  const { comments, addComment } = useTaskComments(selectedTaskId)
  const [commentText, setCommentText] = useState('')
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Permission: only creator can edit/delete
  const isCreator = profile && task ? task.created_by === profile.id : false
  const isAdmin = profile ? profile.role === 'admin' : false
  const canEdit = isCreator || isAdmin

  useEffect(() => {
    if (!selectedTaskId && !isCreating) return
    const supabase = createClient()

    async function load() {
      // Load profiles for assignment
      const { data: profs } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
      if (profs) setProfiles(profs as Profile[])

      if (selectedTaskId) {
        setLoading(true)
        const { data } = await supabase
          .from('tasks')
          .select('*, assignee:profiles!assigned_to(id, full_name, role), creator:profiles!created_by(id, full_name, role)')
          .eq('id', selectedTaskId)
          .single()
        if (data) setTask(data as unknown as Task)
        setLoading(false)
      }
    }
    load()
  }, [selectedTaskId, isCreating])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const isAssignee = profile && task ? task.assigned_to === profile.id : false
  const canChangeStatus = canEdit || isAssignee

  const updateField = async (field: string, value: string | null) => {
    if (!selectedTaskId || !profile) return
    // Status can be changed by assignee too, other fields only by creator/admin
    if (field === 'status' ? !canChangeStatus : !canEdit) return
    const supabase = createClient()
    await supabase.from('tasks').update({ [field]: value || null }).eq('id', selectedTaskId)

    // Notify assignee when task is assigned to them
    if (field === 'assigned_to' && value && value !== profile.id) {
      await supabase.from('notifications').insert({
        user_id: value,
        type: 'task_assigned',
        task_id: selectedTaskId,
        actor_id: profile.id,
        message: `${profile.full_name} назначил вам задачу «${task?.title}»`,
      })
    }

    setTask(prev => prev ? { ...prev, [field]: value || null } as Task : null)
  }

  const handleCreate = async () => {
    if (!createTitle.trim() || !profile) return
    const supabase = createClient()
    const { data } = await supabase.from('tasks').insert({
      title: createTitle.trim(),
      description: createDesc.trim() || null,
      priority: createPriority,
      assigned_to: createAssignee || null,
      due_date: createDue || null,
      created_by: profile.id,
    }).select().single()
    if (data) closeTask()
  }

  const handleDelete = async () => {
    if (!selectedTaskId || !canEdit) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', selectedTaskId)
    setConfirmDelete(false)
    closeTask()
  }

  const handleSendComment = async () => {
    if (!commentText.trim() || !profile || !task) return
    await addComment(commentText.trim())

    // Notify task participants (creator + assignee, except self)
    const supabase = createClient()
    const recipients = new Set<string>()
    if (task.created_by && task.created_by !== profile.id) recipients.add(task.created_by)
    if (task.assigned_to && task.assigned_to !== profile.id) recipients.add(task.assigned_to)

    for (const userId of recipients) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'task_comment',
        task_id: task.id,
        actor_id: profile.id,
        message: `${profile.full_name} оставил комментарий к задаче «${task.title}»`,
      })
    }

    setCommentText('')
  }

  const inputCls = 'w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30'

  // ── CREATE MODE ──
  if (isCreating) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-900">Новая задача</h2>
          <button onClick={closeTask} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Название</label>
            <input value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="Что нужно сделать?" className={inputCls} autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Описание</label>
            <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Подробности..." rows={3} className={inputCls + ' h-auto py-2 resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Приоритет</label>
              <select value={createPriority} onChange={e => setCreatePriority(e.target.value as TaskPriority)} className={inputCls}>
                {PRIORITY_ORDER.map(p => <option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Срок</label>
              <input type="date" value={createDue} onChange={e => setCreateDue(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Исполнитель</label>
            <select value={createAssignee} onChange={e => setCreateAssignee(e.target.value)} className={inputCls}>
              <option value="">Не назначен</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100">
          <button onClick={handleCreate} disabled={!createTitle.trim()} className="w-full h-10 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Создать задачу
          </button>
        </div>
      </div>
    )
  }

  // ── VIEW/EDIT MODE ──
  if (loading || !task) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="skeleton h-5 w-40 rounded" />
          <button onClick={closeTask} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        {canEdit ? (
          <input
            defaultValue={task.title}
            onBlur={e => { if (e.target.value !== task.title) updateField('title', e.target.value) }}
            className="text-[15px] font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 flex-1 mr-2"
          />
        ) : (
          <h2 className="text-[15px] font-bold text-slate-900 flex-1 mr-2">{task.title}</h2>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <button onClick={handleDelete} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${confirmDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`} title={confirmDelete ? 'Нажмите ещё раз для подтверждения' : 'Удалить'}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setConfirmDelete(false); closeTask() }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <span className="text-[12px] text-red-600 font-medium">Удалить задачу? Это действие необратимо.</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-slate-500 hover:text-slate-700 font-medium px-2 py-1">Отмена</button>
            <button onClick={handleDelete} className="text-[11px] bg-red-500 text-white font-semibold px-3 py-1 rounded-lg hover:bg-red-600">Удалить</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Properties — horizontal label:value rows */}
        <div className="px-5 pt-4 pb-2">
          <div className="divide-y divide-slate-100">
            {/* Status */}
            <div className="flex items-center py-2.5">
              <div className="flex items-center gap-2 w-[120px] shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <span className="text-[12px] text-slate-500">Статус</span>
              </div>
              <div className="flex gap-1 flex-1">
                {STATUS_ORDER.map(s => {
                  const cfg = TASK_STATUS_CONFIG[s]
                  const active = task.status === s
                  return (
                    <button key={s} onClick={() => updateField('status', s)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${active ? '' : 'text-slate-400 hover:bg-slate-50'}`}
                      style={active ? { backgroundColor: cfg.bg, color: cfg.color } : {}}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? cfg.color : '#d1d5db' }} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center py-2.5">
              <div className="flex items-center gap-2 w-[120px] shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <span className="text-[12px] text-slate-500">Приоритет</span>
              </div>
              <select value={task.priority} onChange={e => updateField('priority', e.target.value)} disabled={!canEdit}
                className={`text-[12px] text-slate-700 bg-transparent border-none outline-none font-medium py-1 -ml-1 pr-6 ${canEdit ? 'cursor-pointer hover:text-slate-900' : 'opacity-70 cursor-default'}`}>
                {PRIORITY_ORDER.map(p => <option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>

            {/* Assignee */}
            <div className="flex items-center py-2.5">
              <div className="flex items-center gap-2 w-[120px] shrink-0">
                <User className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <span className="text-[12px] text-slate-500">Исполнитель</span>
              </div>
              <select value={task.assigned_to || ''} onChange={e => updateField('assigned_to', e.target.value)} disabled={!canEdit}
                className={`text-[12px] text-slate-700 bg-transparent border-none outline-none font-medium py-1 -ml-1 pr-6 ${canEdit ? 'cursor-pointer hover:text-slate-900' : 'opacity-70 cursor-default'}`}>
                <option value="">Не назначен</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>

            {/* Due date */}
            <div className="flex items-center py-2.5">
              <div className="flex items-center gap-2 w-[120px] shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                <span className="text-[12px] text-slate-500">Дедлайн</span>
              </div>
              <input type="date" value={task.due_date || ''} onChange={e => updateField('due_date', e.target.value)} disabled={!canEdit}
                className={`text-[12px] text-slate-700 bg-transparent border-none outline-none font-medium py-1 -ml-1 ${canEdit ? 'cursor-pointer hover:text-slate-900' : 'opacity-70 cursor-default'}`} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 pb-4">
          {canEdit ? (
            <textarea
              defaultValue={task.description || ''}
              onBlur={e => { if (e.target.value !== (task.description || '')) updateField('description', e.target.value) }}
              placeholder="Добавить описание..."
              rows={3}
              className={inputCls + ' h-auto py-2 resize-none text-[12px]'}
            />
          ) : task.description ? (
            <p className="text-[12px] text-slate-600 leading-relaxed">{task.description}</p>
          ) : null}
        </div>

        {/* Comments */}
        <div className="px-5 pb-4">
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-[12px] font-semibold text-slate-500 mb-3">Комментарии ({comments.length})</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto mb-3">
              {comments.map(c => {
                const initials = c.author?.full_name
                  ? c.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : '??'
                const timeAgo = getTimeAgo(c.created_at)
                return (
                  <div key={c.id} className="flex gap-2.5 group/comment">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-slate-700">{c.author?.full_name || '...'}</span>
                        <span className="text-[10px] text-slate-300">{timeAgo}</span>
                        {(profile?.id === c.author_id || profile?.role === 'admin') && (
                          <button onClick={async () => {
                            const supabase = createClient()
                            await supabase.from('task_comments').delete().eq('id', c.id)
                            const { data } = await supabase.from('task_comments').select('*, author:profiles(id, full_name)').eq('task_id', selectedTaskId!).order('created_at')
                            setComments((data || []) as any)
                          }} className="opacity-0 group-hover/comment:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment input */}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                placeholder="Написать комментарий..."
                className={inputCls + ' flex-1 text-[12px]'}
              />
              <button onClick={handleSendComment} disabled={!commentText.trim()} className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-40 transition-colors shrink-0">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`
  return `${Math.floor(diff / 86400)} д`
}
