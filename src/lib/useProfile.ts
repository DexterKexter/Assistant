'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types/database'

let cachedProfile: Profile | null = null
let fetchPromise: Promise<Profile | null> | null = null

function doFetch(): Promise<Profile | null> {
  const supabase = createClient()
  return supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return null
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => data as Profile | null)
  })
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(!cachedProfile)

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile)
      setLoading(false)
      return
    }
    if (!fetchPromise) fetchPromise = doFetch()
    fetchPromise.then((p) => {
      cachedProfile = p
      setProfile(p)
      setLoading(false)
    })
  }, [])

  const hasRole = (...roles: UserRole[]) => !!profile && roles.includes(profile.role)

  const refresh = async () => {
    cachedProfile = null
    fetchPromise = doFetch()
    const p = await fetchPromise
    cachedProfile = p
    setProfile(p)
  }

  return { profile, loading, hasRole, refresh }
}

/** Invalidate cache (e.g. after role change) */
export function invalidateProfileCache() {
  cachedProfile = null
  fetchPromise = null
}
