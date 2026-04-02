'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUnreadCount() {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      // Get all memberships with last_read_at
      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('profile_id', user.id)

      if (!memberships || !mounted) return

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
      if (mounted) setCount(total)
    }

    fetchUnread()

    // Subscribe to new messages
    const channel = supabase.channel('unread-counter')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [])

  return count
}
