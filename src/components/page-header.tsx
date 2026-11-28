import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Title row of every section page: title (+ optional subtitle) on the left, action buttons on the right.
// Always one row: on phones the title truncates and the buttons collapse to icons. Only buttons go here —
// search and filters belong in FilterBar below.
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold tracking-tight text-slate-900 font-heading">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[12px] text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

const ACTION = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
} as const
// With an icon the label hides below `sm` and the button becomes a 36 px square.
const actionCls = (variant: keyof typeof ACTION, iconOnlyOnPhone: boolean, className?: string) =>
  cn('flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors', ACTION[variant],
    iconOnlyOnPhone ? 'w-9 sm:w-auto sm:px-3' : 'px-3', className)

type ActionProps = { icon?: LucideIcon; variant?: keyof typeof ACTION; children: string }

// Button for the PageHeader actions slot. Rest props go to the <button>, so it also works as a dialog trigger's `render`.
export function PageAction({ icon: Icon, variant = 'primary', children, className, ...rest }: ActionProps & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type="button" aria-label={children} title={children} {...rest} className={actionCls(variant, !!Icon, className)}>
      {Icon && <Icon className="h-4 w-4" />}<span className={cn(Icon && 'hidden sm:inline')}>{children}</span>
    </button>
  )
}

// Same look as PageAction, for navigation.
export function PageActionLink({ icon: Icon, variant = 'secondary', children, className, ...rest }: ActionProps & Omit<ComponentProps<typeof Link>, 'children'>) {
  return (
    <Link aria-label={children} title={children} {...rest} className={actionCls(variant, !!Icon, className)}>
      {Icon && <Icon className="h-4 w-4" />}<span className={cn(Icon && 'hidden sm:inline')}>{children}</span>
    </Link>
  )
}
