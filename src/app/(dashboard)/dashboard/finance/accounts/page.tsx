'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Coins, Pencil, Plus, Save, Wallet, X } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { ACCOUNT_ICONS, accountIcon, type AccountIcon } from '@/lib/account-icons'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { FinanceTabs } from '@/components/finance-tabs'
import { CURRENCIES, maskNumber, money, totalsByCurrency, type Account } from '@/lib/accounts'
import { PageHeader, PageAction } from '@/components/page-header'
import { FilterBar, FilterTabs, SearchInput } from '@/components/filter-bar'

const emptyForm = { name: '', kind: 'Банк', currency: 'KZT' as Account['currency'], bank: '', number: '', balance: '', notes: '' }

// Same controls as the new shipment / new request windows.
const inpCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-300'
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500'

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

  // Types are a user-editable list (table account_types), each with an icon from ACCOUNT_ICONS.
  const [types, setTypes] = useState<{ name: string; icon: string }[]>([])
  // null = not adding; otherwise the new type being composed.
  const [newType, setNewType] = useState<{ name: string; icon: AccountIcon } | null>(null)
  const iconOf = (kind: string) => accountIcon(types.find(t => t.name === kind)?.icon)
  useEffect(() => {
    createClient().from('account_types').select('name, icon').order('created_at').then(({ data }) => setTypes((data ?? []) as { name: string; icon: string }[]))
  }, [])
  const addType = async () => {
    const name = (newType?.name ?? '').trim()
    if (!newType || !name) { setNewType(null); return }
    const existing = types.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (!existing) {
      const { error } = await createClient().from('account_types').insert({ name, icon: newType.icon })
      if (error) { setFormError('Не удалось добавить тип.'); return }
      setTypes(t => [...t, { name, icon: newType.icon }])
    }
    setForm(f => ({ ...f, kind: existing?.name ?? name }))
    setNewType(null)
  }


  const load = () => createClient().from('accounts').select('*').order('name').then(({ data, error }) => {
    if (error) setError('Не удалось загрузить счета.')
    else setAccounts((data ?? []) as Account[])
    setLoading(false)
  })
  useEffect(() => { load() }, [])

  const open = (a?: Account) => {
    setForm(a ? { name: a.name, kind: a.kind, currency: a.currency, bank: a.bank ?? '', number: a.number ?? '', balance: String(Number(a.balance)), notes: a.notes } : emptyForm)
    setFormError('')
    setNewType(null)
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
      <PageHeader title="Счета">
        <PageAction icon={Plus} onClick={() => open()}>Новый счёт</PageAction>
      </PageHeader>

      {/* Dashboard: one card per currency (never converted), plus counts. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {totalsByCurrency(accounts).map(([currency, total]) => (
          <StatCard key={currency} icon={Coins} label={`Остаток · ${currency}`} value={money(total, currency)} />
        ))}
        <StatCard icon={Wallet} label="Счетов" value={active.length} hint={archivedCount > 0 ? `${archivedCount} в архиве` : undefined} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
        <FilterBar className="border-b border-slate-100 px-4 py-3">
          <FilterTabs label="Счета" value={showArchived ? 'archive' : 'active'} onChange={k => setShowArchived(k === 'archive')}
            options={[{ key: 'active', label: 'Активные', count: active.length }, { key: 'archive', label: 'Архив', count: archivedCount }]} />
          <SearchInput value={search} onChange={setSearch} placeholder="Название, банк, номер" />
        </FilterBar>

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
              const Icon = iconOf(a.kind)
              return (
                <li key={a.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Icon className="h-4 w-4 text-slate-600" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{a.name}</p>
                    <p className="truncate text-[12px] text-slate-400">{[a.kind, a.bank, maskNumber(a.number)].filter(Boolean).join(' · ')}</p>
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
        <div data-overlay className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-4" onClick={close}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150" />
          <form onSubmit={save} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close() }}
            className="relative mx-3 mb-3 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-indigo-50/70 via-white/60 to-violet-50/70 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_12px_40px_-4px_rgba(79,70,229,0.25),0_4px_12px_-2px_rgba(15,23,42,0.08),inset_0_1px_0_0_rgba(255,255,255,0.8)] backdrop-blur-[24px] backdrop-saturate-200 animate-in slide-in-from-bottom duration-200 md:mx-0 md:mb-0 md:max-w-[560px] md:zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/60 px-5 pb-3 pt-3">
              <p className="font-heading text-[15px] font-bold text-slate-900">{editing.id ? 'Счёт' : 'Новый счёт'}</p>
              <button type="button" onClick={close} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 active:bg-white/80"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {/* Type first: it is the main choice, shown as tiles that scale to any number of custom types. */}
              <div>
                <p className={labelCls}>Тип счёта</p>
                <div className="grid grid-cols-3 gap-2">
                  {[...types.map(t => t.name), ...(types.some(t => t.name === form.kind) ? [] : [form.kind])].map(k => {
                    const Icon = iconOf(k), active = form.kind === k
                    return (
                      <button key={k} type="button" onClick={() => setForm(f => ({ ...f, kind: k }))} aria-pressed={active}
                        className={cn('flex h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-[12px] font-medium transition-all',
                          active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                        <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{k}</span>
                      </button>
                    )
                  })}
                  {newType === null && (
                    <button type="button" onClick={() => setNewType({ name: '', icon: 'wallet' })}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-[12px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700">
                      <Plus className="h-4 w-4" /> Новый тип
                    </button>
                  )}
                </div>
                {newType && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex gap-2">
                      <input autoFocus maxLength={40} value={newType.name} placeholder="Название типа" aria-label="Название нового типа"
                        onChange={e => setNewType({ ...newType, name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType() } if (e.key === 'Escape') { e.stopPropagation(); setNewType(null) } }}
                        className={inpCls} />
                      <button type="button" onClick={() => setNewType(null)} className="h-9 shrink-0 rounded-lg px-3 text-[12px] font-medium text-slate-500 hover:bg-slate-100">Отмена</button>
                      <button type="button" onClick={addType} disabled={!newType.name.trim()} className="h-9 shrink-0 rounded-lg bg-slate-900 px-3 text-[12px] font-medium text-white disabled:opacity-40">Добавить</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Иконка типа">
                      {(Object.keys(ACCOUNT_ICONS) as AccountIcon[]).map(key => {
                        const Icon = ACCOUNT_ICONS[key], active = newType.icon === key
                        return (
                          <button key={key} type="button" role="radio" aria-checked={active} aria-label={key} onClick={() => setNewType({ ...newType, icon: key })}
                            className={cn('flex h-9 items-center justify-center rounded-lg border transition-all', active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700')}>
                            <Icon className="h-4 w-4" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <label className="block"><span className={labelCls}>Название *</span>
                <input autoFocus maxLength={120} placeholder="Например, Kaspi Business" className={inpCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </label>

              {/* Balance with its currency as one field: the number never shows without its unit. */}
              <div><span className={labelCls}>Остаток</span>
                <div className="flex h-9 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-500/30">
                  <input inputMode="decimal" placeholder="0" aria-label="Остаток" className="min-w-0 flex-1 bg-transparent px-2.5 text-[13px] tabular-nums text-slate-700 outline-none placeholder:text-slate-400"
                    value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
                  <select aria-label="Валюта" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as Account['currency'] }))}
                    className="border-l border-slate-200 bg-slate-50 px-2.5 text-[13px] font-medium text-slate-700 outline-none">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label><span className={labelCls}>Банк</span><input maxLength={120} placeholder="Необязательно" className={inpCls} value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></label>
                <label><span className={labelCls}>Номер счёта / IBAN</span><input maxLength={60} placeholder="Необязательно" autoComplete="off" className={cn(inpCls, 'font-mono')} value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} /></label>
              </div>

              <label className="block"><span className={labelCls}>Заметка</span>
                <textarea maxLength={1000} rows={2} placeholder="Необязательно" className={cn(inpCls, 'h-auto resize-none py-2')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </label>
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
