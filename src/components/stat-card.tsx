import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// KPI card used across the app: gray, borderless, white icon square on the left, value over label. One look everywhere — no colour variants.
export function StatCard({ icon: Icon, label, value, hint, onClick, className }: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cn('flex w-full min-w-0 items-center gap-3 rounded-2xl bg-slate-100 p-4 text-left', onClick && 'transition-colors hover:bg-slate-200/70', className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[20px] font-bold leading-tight tracking-tight tabular-nums text-slate-900 font-heading">{value}</p>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">{label}{hint && <span className="text-slate-400"> · {hint}</span>}</p>
      </div>
    </Tag>
  )
}
