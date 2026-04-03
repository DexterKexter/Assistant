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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mountedRef.current) return

      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('profile_id', user.id)

      if (!memberships || !mountedRef.current) return

      let total = 0
      for (const m of memberships) {
        const { count: c } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', m.conversation_id)
          .gt('created_at', m.last_read_at)
          .neq('sender_id', user.id)
        total += c || 0
      }
      if (mountedRef.current) setCount(total)
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
