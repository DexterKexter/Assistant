export const CURRENCIES = ['KZT', 'USD', 'RUB', 'AED', 'CNY', 'EUR'] as const
const SYMBOLS: Record<string, string> = { KZT: '₸', USD: '$', RUB: '₽', AED: 'AED', CNY: '¥', EUR: '€' }

export type Account = {
  id: string; name: string; kind: string; currency: (typeof CURRENCIES)[number]
  bank: string | null; number: string | null; balance: number | string; notes: string; archived_at: string | null; updated_at: string
}

// Supabase returns numeric as a string; sums are per currency, never converted.
export function totalsByCurrency(accounts: Pick<Account, 'currency' | 'balance' | 'archived_at'>[]) {
  const totals = new Map<string, number>()
  for (const a of accounts) if (!a.archived_at) totals.set(a.currency, (totals.get(a.currency) ?? 0) + Number(a.balance))
  return [...totals].sort((a, b) => CURRENCIES.indexOf(a[0] as never) - CURRENCIES.indexOf(b[0] as never))
}

export const money = (value: number | string, currency: string) =>
  `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${SYMBOLS[currency] ?? currency}`

// Only the tail of an account number is shown in lists.
export const maskNumber = (n: string | null) => (n && n.replace(/\s/g, '').length > 4 ? `•• ${n.replace(/\s/g, '').slice(-4)}` : n || '')
