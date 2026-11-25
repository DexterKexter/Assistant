'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChatTabs } from '@/components/chat-tabs'
import { WaText } from '@/components/wa-text'
import { TEMPLATES, compileTemplate, fillTemplate } from '@/lib/whatsapp-template'

const STATUS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Одобрен', className: 'bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'На проверке', className: 'bg-amber-50 text-amber-800' },
  REJECTED: { label: 'Отклонён', className: 'bg-rose-50 text-rose-700' },
}
const NOT_SENT = { label: 'Не отправлен в Meta', className: 'bg-slate-100 text-slate-500' }

type MetaStatus = { name: string; status: string; rejected_reason?: string }

export default function TemplatesPage() {
  const [meta, setMeta] = useState<MetaStatus[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/whatsapp/templates').then(async r => {
      const data = await r.json().catch(() => ({ error: 'Не удалось загрузить статусы' }))
      if (cancelled) return
      setMeta(r.ok ? data.data || [] : [])
      setError(r.ok ? '' : data.error)
    })
    return () => { cancelled = true }
  }, [version])

  async function submit(name: string) {
    setBusy(name)
    const res = await fetch('/api/whatsapp/templates', { method: 'POST', body: JSON.stringify({ name }) })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Не удалось отправить шаблон')
    setBusy(''); setVersion(v => v + 1)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="-mx-3 -mt-3 flex h-14 items-end border-b border-slate-100 px-4 md:-mx-5 md:-mt-4"><ChatTabs /></div>
      <p className="text-[13px] text-slate-500 max-w-2xl">
        Готовые сообщения для WhatsApp. Нужны, чтобы написать клиенту первым или когда он не отвечал больше 24 часов.
        Данные клиента и перевозки подставляются сами.
      </p>
      {error && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map(t => {
          const { body, examples } = compileTemplate(t.text)
          const m = meta?.find(x => x.name === t.name)
          const status = m ? STATUS[m.status] || { label: m.status, className: NOT_SENT.className } : NOT_SENT
          return (
            <div key={t.name} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-slate-900 font-heading">{t.title}</h2>
                {meta === null
                  ? <span className="skeleton h-5 w-20 rounded-full" />
                  : <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', status.className)}>{status.label}</span>}
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-md bg-[#efeae2] p-2">
                <p className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-800 shadow-sm"><WaText text={fillTemplate(body, examples)} /></p>
              </div>
              {m?.status === 'REJECTED' && m.rejected_reason && <p className="text-[12px] text-rose-600">Причина: {m.rejected_reason}</p>}
              {meta !== null && !m && (
                <button onClick={() => submit(t.name)} disabled={!!busy}
                  className="h-9 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                  {busy === t.name ? 'Отправляем…' : 'Отправить на одобрение'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
