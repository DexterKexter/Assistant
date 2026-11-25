'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUnreadCount() {
  const [count, setCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()
    const channelName = `unread-${Date.now()}-${Math.random().toString(36).slice(2)}`

    async function fetchUnread() {
      try {
        const { data } = await supabase.rpc('my_unread_count')
        if (mountedRef.current) setCount(data || 0)
      } catch { /* auth lock contention */ }
    }

    fetchUnread()

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [])

  return count
}
