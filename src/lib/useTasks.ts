'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskComment } from '@/types/database'

const TASK_SELECT = '*, assignee:profiles!assigned_to(id, full_name, role), creator:profiles!created_by(id, full_name, role)'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchTasks = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('created_at', { ascending: false })
    if (mountedRef.current && data) {
      setTasks(data as unknown as Task[])
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()
    const channelName = `tasks-${Date.now()}-${Math.random().toString(36).slice(2)}`

    fetchTasks()

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  return { tasks, loading, refetch: fetchTasks }
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const fetchComments = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:profiles(id, full_name, role)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (mountedRef.current) {
      setComments((data as unknown as TaskComment[]) || [])
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    mountedRef.current = true
    if (!taskId) { setComments([]); return }

    const supabase = createClient()
    const channelName = `task-comments-${taskId}-${Date.now()}`

    fetchComments()

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, () => {
        fetchComments()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [taskId, fetchComments])

  const addComment = async (content: string) => {
    if (!taskId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('task_comments').insert({ task_id: taskId, author_id: user.id, content })
  }

  return { comments, loading, addComment, refetch: fetchComments }
}

export function useMyTaskCount() {
  const [count, setCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()
    const channelName = `my-tasks-${Date.now()}-${Math.random().toString(36).slice(2)}`

    async function fetchCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !mountedRef.current) return
      const { count: c } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'done')
      if (mountedRef.current) setCount(c || 0)
      } catch { /* auth lock contention — ignore */ }
    }

    fetchCount()

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchCount()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [])

  return count
}
