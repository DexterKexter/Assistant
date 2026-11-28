import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Title row of every section page: title (+ optional subtitle) on the left, actions on the right.
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold tracking-tight text-slate-900 font-heading">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

const ACTION = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
} as const
const actionCls = (variant: keyof typeof ACTION, className?: string) =>
  cn('flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors', ACTION[variant], className)

type ActionProps = { icon?: LucideIcon; variant?: keyof typeof ACTION; children: ReactNode }

// Button for the PageHeader actions slot. Rest props go to the <button>, so it also works as a dialog trigger's `render`.
export function PageAction({ icon: Icon, variant = 'primary', children, className, ...rest }: ActionProps & ComponentProps<'button'>) {
  return (
    <button type="button" {...rest} className={actionCls(variant, className)}>
      {Icon && <Icon className="h-4 w-4" />}{children}
    </button>
  )
}

// Same look as PageAction, for navigation.
export function PageActionLink({ icon: Icon, variant = 'secondary', children, className, ...rest }: ActionProps & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className={actionCls(variant, className)}>
      {Icon && <Icon className="h-4 w-4" />}{children}
    </Link>
  )
}
