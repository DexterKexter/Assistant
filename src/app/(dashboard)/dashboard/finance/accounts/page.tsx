'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Banknote, CreditCard, Landmark, Pencil, Plus, Save, Search, Wallet, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { FinanceTabs } from '@/components/finance-tabs'
import { ACCOUNT_KINDS, CURRENCIES, maskNumber, money, totalsByCurrency, type Account } from '@/lib/accounts'

const KIND_ICONS = { bank: Landmark, cash: Banknote, card: CreditCard, other: Wallet }
const emptyForm = { name: '', kind: 'bank' as Account['kind'], currency: 'KZT' as Account['currency'], bank: '', number: '', balance: '', notes: '' }

// Same controls as the new shipment / new request windows.
const inpCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300'
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500'
const pill = (label: string, active: boolean, onClick: () => void) => (
  <button key={label} type="button" onClick={onClick} aria-pressed={active}
    className={cn('h-7 rounded-full border px-3 text-[11px] font-medium transition-all', active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>{label}</button>
)

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  // null = window closed; id null = new account.
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => createClient().from('accounts').select('*').order('name').then(({ data, error }) => {
    if (error) setError('Не удалось загрузить счета.')
    else setAccounts((data ?? []) as Account[])
    setLoading(false)
  })
  useEffect(() => { load() }, [])

  const open = (a?: Account) => {
    setForm(a ? { name: a.name, kind: a.kind, currency: a.currency, bank: a.bank ?? '', number: a.number ?? '', balance: String(Number(a.balance)), notes: a.notes } : emptyForm)
    setFormError('')
    setEditing({ id: a?.id ?? null })
  }
  const close = () => { if (!saving) setEditing(null) }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!form.name.trim()) { setFormError('Укажите название счёта.'); return }
    const balance = form.balance.trim() === '' ? 0 : Number(form.balance.replace(',', '.'))
    if (!Number.isFinite(balance)) { setFormError('Остаток должен быть числом.'); return }
    setSaving(true); setFormError('')
    const row = { name: form.name.trim(), kind: form.kind, currency: form.currency, bank: form.bank.trim() || null, number: form.number.trim() || null, balance, notes: form.notes.trim() }
    const supabase = createClient()
    const { error } = editing.id ? await supabase.from('accounts').update(row).eq('id', editing.id) : await supabase.from('accounts').insert(row)
    setSaving(false)
    if (error) { setFormError('Не удалось сохранить. Данные остались в форме — попробуйте ещё раз.'); return }
    setEditing(null)
    load()
  }

  const setArchived = async (a: Account, archived: boolean) => {
    if (archived && !confirm(`Архивировать счёт «${a.name}»? Он пропадёт из списка и итогов, вернуть можно из архива.`)) return
    const { error } = await createClient().from('accounts').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', a.id)
    if (error) alert('Не удалось изменить счёт.')
    else load()
  }

  const active = accounts.filter(a => !a.archived_at)
  const archivedCount = accounts.length - active.length
  const q = search.trim().toLowerCase()
  const visible = accounts.filter(a => !!a.archived_at === showArchived && (!q || `${a.name} ${a.bank ?? ''} ${a.number ?? ''}`.toLowerCase().includes(q)))

  return (
    <div className="space-y-5 pb-6">
      <FinanceTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 font-heading">Счета</h1>
        <button onClick={() => open()} className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-slate-800">
          <Plus className="h-4 w-4" /> Новый счёт
        </button>
      </div>

      {/* Dashboard: one card per currency (never converted), plus counts. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {totalsByCurrency(accounts).map(([currency, total]) => (
          <div key={currency} className="rounded-2xl border border-slate-200/70 bg-white p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Остаток · {currency}</p>
            <p className="mt-1 truncate text-[20px] font-bold tabular-nums text-slate-900">{money(total, currency)}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Счетов</p>
          <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900">{active.length}{archivedCount > 0 && <span className="ml-2 text-[12px] font-medium text-slate-400">+ {archivedCount} в архиве</span>}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
            {([[false, 'Активные'], [true, 'Архив']] as const).map(([v, label]) => (
              <button key={label} onClick={() => setShowArchived(v)} aria-pressed={showArchived === v}
                className={cn('h-7 rounded-md px-3 text-[12px] font-medium', showArchived === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                {label}{v && archivedCount > 0 ? ` · ${archivedCount}` : ''}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Название, банк, номер" aria-label="Поиск счетов" className={cn(inpCls, 'pl-8')} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}</div>
        ) : error ? (
          <p role="alert" className="p-6 text-center text-[13px] text-red-600">{error}</p>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-slate-200" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-slate-500">{q ? 'Ничего не найдено' : showArchived ? 'В архиве пусто' : 'Счетов пока нет'}</p>
            {!q && !showArchived && <p className="mt-1 text-[12px] text-slate-400">Добавьте банковский счёт, кассу или карту.</p>}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map(a => {
              const Icon = KIND_ICONS[a.kind]
              return (
                <li key={a.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Icon className="h-4 w-4 text-slate-600" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{a.name}</p>
                    <p className="truncate text-[12px] text-slate-400">{[ACCOUNT_KINDS[a.kind], a.bank, maskNumber(a.number)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <p className={cn('shrink-0 text-right text-[14px] font-semibold tabular-nums', Number(a.balance) < 0 ? 'text-red-600' : 'text-slate-900')}>{money(a.balance, a.currency)}</p>
                  <div className="flex shrink-0 gap-0.5">
                    <button onClick={() => open(a)} title="Редактировать" aria-label={`Редактировать ${a.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setArchived(a, !a.archived_at)} title={a.archived_at ? 'Вернуть из архива' : 'Архивировать'} aria-label={`${a.archived_at ? 'Вернуть из архива' : 'Архивировать'} ${a.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      {a.archived_at ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Add / edit window: same shell as the new shipment window. */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-4" onClick={close}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <form onSubmit={save} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close() }}
            className="relative mx-3 mb-3 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[24px] backdrop-saturate-200 animate-in slide-in-from-bottom duration-200 md:mx-0 md:mb-0 md:max-w-[560px] md:zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/60 px-5 pb-3 pt-3">
              <p className="font-heading text-[15px] font-bold text-slate-900">{editing.id ? 'Счёт' : 'Новый счёт'}</p>
              <button type="button" onClick={close} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 active:bg-white/80"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-4 rounded-2xl bg-white/60 p-4 ring-1 ring-white/80">
                <label className="block"><span className={labelCls}>Название *</span><input autoFocus maxLength={120} placeholder="Например, Kaspi Business" className={inpCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
                <div><p className={labelCls}>Тип</p><div className="flex flex-wrap gap-1">{(Object.keys(ACCOUNT_KINDS) as Account['kind'][]).map(k => pill(ACCOUNT_KINDS[k], form.kind === k, () => setForm(f => ({ ...f, kind: k }))))}</div></div>
                <div><p className={labelCls}>Валюта</p><div className="flex flex-wrap gap-1">{CURRENCIES.map(c => pill(c, form.currency === c, () => setForm(f => ({ ...f, currency: c }))))}</div></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label><span className={labelCls}>Банк</span><input maxLength={120} placeholder="—" className={inpCls} value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></label>
                  <label><span className={labelCls}>Номер счёта / IBAN</span><input maxLength={60} placeholder="—" autoComplete="off" className={cn(inpCls, 'font-mono')} value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} /></label>
                  <label><span className={labelCls}>Остаток</span><input inputMode="decimal" placeholder="0" className={cn(inpCls, 'tabular-nums')} value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} /></label>
                  <label><span className={labelCls}>Заметка</span><input maxLength={1000} placeholder="—" className={inpCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
                </div>
              </div>
              {formError && <p role="alert" className="px-1 text-[13px] text-red-600">{formError}</p>}
            </div>
            <div className="flex items-center gap-2 border-t border-white/60 bg-white/20 px-5 pb-3 pt-3">
              <button type="button" onClick={close} className="h-10 flex-1 rounded-xl border border-white/80 bg-white/60 text-[13px] font-medium text-slate-600 active:bg-white/90">Отмена</button>
              <button type="submit" disabled={saving} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white shadow-md shadow-indigo-500/25 active:bg-indigo-700 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
