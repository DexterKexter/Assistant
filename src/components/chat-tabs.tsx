'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useProfile } from '@/lib/useProfile'

// "Чаты" section for staff: client chats (WhatsApp) and message templates.
export function ChatTabs() {
  const pathname = usePathname()
  const { hasRole } = useProfile()
  if (!hasRole('admin', 'manager')) return <h2 className="text-[16px] font-bold text-slate-900 font-heading">Чаты</h2>
  return (
    <div className="flex gap-5">
      {[{ href: '/dashboard/crm', label: 'Клиенты' }, { href: '/dashboard/crm/templates', label: 'Шаблоны' }].map(t => (
        <Link key={t.href} href={t.href}
          className={cn('-mb-px border-b-2 pb-3 pt-1 text-[13px]',
            pathname === t.href ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent font-medium text-slate-400 hover:text-slate-700')}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
