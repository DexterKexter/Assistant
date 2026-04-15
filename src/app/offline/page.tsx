'use client'

import { Ship, RefreshCw, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-slate-50 to-white">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <Ship className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[17px] text-slate-900">Logistics</span>
      </div>

      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
        <WifiOff className="w-7 h-7 text-indigo-500" strokeWidth={1.8} />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 font-heading mb-2">Нет подключения</h1>
      <p className="text-[14px] text-slate-500 max-w-xs leading-relaxed mb-8">
        Не удалось загрузить страницу. Проверьте интернет-соединение и попробуйте снова.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-[14px] font-semibold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 active:scale-95 transition-all"
      >
        <RefreshCw className="w-4 h-4" strokeWidth={2.2} />
        Повторить
      </button>

      <p className="text-[12px] text-slate-400 mt-8">
        Ранее посещённые страницы доступны из кэша
      </p>
    </div>
  )
}
