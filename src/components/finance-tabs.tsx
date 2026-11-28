'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Sub-pages of "Финансы".
const TABS = [{ href: '/dashboard/finance', label: 'Операции' }, { href: '/dashboard/finance/accounts', label: 'Счета' }]

export function FinanceTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-5 border-b border-slate-200/70">
      {TABS.map(t => (
        <Link key={t.href} href={t.href}
          className={cn('-mb-px border-b-2 pb-2.5 text-[13px]', pathname === t.href ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent font-medium text-slate-400 hover:text-slate-700')}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
