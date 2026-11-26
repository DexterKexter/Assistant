'use client'

import { useState } from 'react'

export type FormCopy = {
  name: string; phone: string; origin: string; destination: string; destinationHint: string
  size: string; notes: string; notesHint: string; submit: string; sending: string
  done: string; doneText: string; error: string; origins: string[]
}

const field = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900'
const label = 'mb-1.5 block text-[13px] font-medium text-slate-600'

export function LandingForm({ t }: { t: FormCopy }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [size, setSize] = useState(40)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/cargo-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, size }) }).catch(() => null)
    setState(res?.ok ? 'done' : 'error')
  }

  if (state === 'done') return (
    <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8">
      <p className="font-heading text-xl font-bold text-slate-900">{t.done}</p>
      <p className="mt-2 text-[15px] text-slate-600">{t.doneText}</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2 sm:p-8">
      <label><span className={label}>{t.name}</span><input name="name" required maxLength={120} autoComplete="name" className={field} /></label>
      <label><span className={label}>{t.phone}</span><input name="phone" required type="tel" maxLength={40} autoComplete="tel" placeholder="+7" className={field} /></label>
      <label><span className={label}>{t.origin}</span>
        <select name="origin" required className={field}>{t.origins.map(o => <option key={o}>{o}</option>)}</select>
      </label>
      <label><span className={label}>{t.destination}</span><input name="destination" required maxLength={160} placeholder={t.destinationHint} className={field} /></label>
      <fieldset className="sm:col-span-2">
        <legend className={label}>{t.size}</legend>
        <div className="flex gap-2">
          {[20, 40].map(s => (
            <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}
              className={`h-11 flex-1 rounded-lg border text-[15px] font-medium ${size === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>{s} ft</button>
          ))}
        </div>
      </fieldset>
      <label className="sm:col-span-2"><span className={label}>{t.notes}</span><textarea name="notes" rows={3} maxLength={3000} placeholder={t.notesHint} className={`${field} h-auto py-2.5`} /></label>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button disabled={state === 'sending'} className="h-12 rounded-lg bg-slate-900 px-6 text-[15px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{state === 'sending' ? t.sending : t.submit}</button>
        {state === 'error' && <p role="alert" className="text-[14px] text-red-600">{t.error}</p>}
      </div>
    </form>
  )
}
