'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Ship, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Неверный email или пароль'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden lg:flex w-[45%] bg-[#0f172a] text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Ship className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Logistics</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight max-w-md">
            Управление
            <br />перевозками
            <br />
            <span className="text-blue-400">без хаоса.</span>
          </h1>
          <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
            Контейнеры, клиенты, финансы и документы — всё в одном месте.
          </p>
        </div>
        <p className="text-xs text-slate-600 relative z-10">© 2024 Logistics Dashboard</p>
        {/* Decorative */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute top-20 -right-16 w-64 h-64 bg-blue-600/10 rounded-full blur-2xl" />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Logistics</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Вход в систему</h2>
          <p className="text-sm text-slate-400 mt-2 mb-8">Введите данные для доступа к панели</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Пароль</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full h-11 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Вход...' : <><span>Войти</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-sm text-center text-slate-400 mt-6">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">Регистрация</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
