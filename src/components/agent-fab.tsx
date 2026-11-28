'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { useProfile } from '@/lib/useProfile'

// The assistant page fills its nearest positioned parent, so the same component works inside this drawer.
// Loaded on first open: it pulls in the chart library.
const AgentPage = dynamic(() => import('@/app/(dashboard)/dashboard/agent/page'), { ssr: false })

export function AgentFab() {
  const { hasRole } = useProfile()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!hasRole('admin', 'manager') || pathname === '/dashboard/agent') return null

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="AI ассистент" title="AI ассистент"
          data-agent-fab className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6">
          <Sparkles className="h-5 w-5" />
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/20 animate-in fade-in duration-150" onClick={() => setOpen(false)} />
          <aside role="dialog" aria-label="AI ассистент"
            className="fixed inset-y-0 right-0 z-50 w-full bg-white shadow-2xl sm:w-[460px] animate-in slide-in-from-right duration-200">
            <AgentPage />
            <button onClick={() => setOpen(false)} aria-label="Закрыть"
              className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:-left-10 sm:bg-white sm:shadow">
              <X className="h-4 w-4" />
            </button>
          </aside>
        </>
      )}
    </>
  )
}
