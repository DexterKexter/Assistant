'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useProfile } from '@/lib/useProfile'

// One "Чаты" section: client chats (WhatsApp) and the internal team chat.
export function ChatTabs() {
  const pathname = usePathname()
  const { hasRole } = useProfile()
  if (!hasRole('admin', 'manager')) return <h2 className="text-[16px] font-bold text-slate-900 font-heading">Чаты</h2>
  return (
    <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
      {[{ href: '/dashboard/crm', label: 'Клиенты' }, { href: '/dashboard/messages', label: 'Команда' }, { href: '/dashboard/crm/templates', label: 'Шаблоны' }].map(t => (
        <Link key={t.href} href={t.href}
          className={cn('px-3 py-1 rounded-lg text-[13px] font-semibold',
            pathname === t.href ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
