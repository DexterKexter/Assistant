'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { useNotifications } from '@/lib/useNotifications'
import { useTaskModal } from '@/lib/task-modal'
import { Search, Bell, CheckCheck, UserPlus, MessageSquare, X } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  accountant: 'Бухгалтер',
  client: 'Клиент',
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

export function Header() {
  const { profile } = useProfile()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { openTask } = useTaskModal()
  const [showNotifs, setShowNotifs] = useState(false)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const handleNotifClick = (notif: typeof notifications[0]) => {
    markAsRead(notif.id)
    if (notif.task_id) {
      openTask(notif.task_id)
    }
    setShowNotifs(false)
  }

  return (
    <>
      <header className="flex h-[56px] items-center gap-3 md:gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 md:px-6">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по номеру контейнера..."
            className="w-full h-9 rounded-lg bg-slate-50 border border-slate-200/60 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-all"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-9 h-9 rounded-lg border border-slate-200/60 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <Bell className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-indigo-500 rounded-full ring-2 ring-white text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden md:block h-8 w-px bg-slate-100" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold">
              {initials}
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold text-slate-800 leading-tight">
                {profile?.full_name || '...'}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                {profile ? ROLE_LABELS[profile.role] || profile.role : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Notification modal */}
      {showNotifs && (
        <div className="fixed inset-0 z-[900] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowNotifs(false)}>
          <div
            className="absolute top-[56px] right-3 md:right-6 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-[14px] font-bold text-slate-900">Уведомления</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-indigo-500 hover:bg-indigo-50 font-medium transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" strokeWidth={2} />
                    Прочитать все
                  </button>
                )}
                <button onClick={() => setShowNotifs(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] text-slate-400">Нет уведомлений</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const actorInitials = notif.actor?.full_name
                    ? notif.actor.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : '??'
                  const Icon = notif.type === 'task_assigned' ? UserPlus : MessageSquare
                  const iconColor = notif.type === 'task_assigned' ? 'text-indigo-500' : 'text-emerald-500'

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[9px] font-bold">
                          {actorInitials}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center`}>
                          <Icon className={`w-2.5 h-2.5 ${iconColor}`} strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] leading-relaxed ${!notif.is_read ? 'text-slate-800' : 'text-slate-500'}`}>
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{getTimeAgo(notif.created_at)}</span>
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
