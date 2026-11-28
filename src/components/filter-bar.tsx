import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// Row under the PageHeader: filter tabs on the left, search (and extras) on the right. Everything 36 px high.
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>{children}</div>
}

// Segmented control for list filters (status, activity, archive). Counts are optional.
export function FilterTabs<K extends string>({ options, value, onChange, label }: {
  options: { key: K; label: string; count?: number }[]
  value: K
  onChange: (key: K) => void
  label?: string
}) {
  return (
    <div role="group" aria-label={label} className="flex h-9 max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5">
      {options.map(o => {
        const active = o.key === value
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} aria-pressed={active}
            className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors',
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            {o.label}
            {o.count !== undefined && <span className={cn('tabular-nums', active ? 'text-slate-500' : 'text-slate-400')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Поиск', className }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cn('relative block w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500/30" />
    </label>
  )
}
