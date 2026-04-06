'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { createClient } from '@/lib/supabase/client'
import { Ship, Users, Wallet, CheckSquare, BarChart3, ArrowRight, Sparkles, FileText, MessageSquare } from 'lucide-react'

const STEPS = [
  {
    icon: Sparkles,
    iconColor: '#6366f1',
    iconBg: '#eef2ff',
    title: 'Добро пожаловать в Logistics!',
    description: 'Управляйте перевозками, клиентами, финансами и задачами в одном месте. Давайте быстро покажем основные возможности.',
  },
  {
    icon: Ship,
    iconColor: '#6366f1',
    iconBg: '#eef2ff',
    title: 'Перевозки',
    description: 'Отслеживайте контейнеры от загрузки до доставки. Статусы обновляются автоматически, даты можно менять прямо в таблице. Фильтруйте по перевозчику, клиенту или статусу.',
  },
  {
    icon: Users,
    iconColor: '#059669',
    iconBg: '#f0fdf4',
    title: 'Клиенты и Финансы',
    description: 'База клиентов с разделением на РФ и КЗ. Учёт доходов и расходов по категориям. Баланс и транзакции в реальном времени.',
  },
  {
    icon: CheckSquare,
    iconColor: '#f59e0b',
    iconBg: '#fffbeb',
    title: 'Задачи',
    description: 'Канбан-доска с 4 статусами. Назначайте задачи сотрудникам, ставьте дедлайны, оставляйте комментарии. Уведомления о новых задачах и комментариях.',
  },
  {
    icon: BarChart3,
    iconColor: '#8b5cf6',
    iconBg: '#f5f3ff',
    title: 'Отчёты',
    description: 'Годовые и месячные отчёты с графиками. Сравнение периодов, аналитика по направлениям, перевозчикам и клиентам. Экспорт данных.',
  },
  {
    icon: null,
    iconColor: '#22c55e',
    iconBg: '#f0fdf4',
    title: 'Всё готово!',
    description: 'Вы готовы начать работу. Справочник по приложению всегда доступен по кнопке "?" в правом верхнем углу.',
  },
]

export function OnboardingModal() {
  const { profile } = useProfile()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)

  if (!profile || profile.onboarding_completed || !visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  const handleComplete = async () => {
    const supabase = createClient()
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id)
    setVisible(false)
  }

  const handleNext = () => {
    if (isLast) {
      handleComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          {Icon && (
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: current.iconBg }}>
              <Icon className="w-8 h-8" style={{ color: current.iconColor }} strokeWidth={1.8} />
            </div>
          )}
          {!Icon && (
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-emerald-50">
              <span className="text-3xl">&#127881;</span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-[20px] font-bold text-slate-900 mb-3 font-heading">{current.title}</h2>

          {/* Description */}
          <p className="text-[13px] text-slate-500 leading-relaxed max-w-sm mx-auto">{current.description}</p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-200'}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            {!isLast && (
              <button onClick={handleSkip} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium">
                Пропустить
              </button>
            )}
            <button
              onClick={handleNext}
              className="h-10 px-5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {isLast ? 'Начать работу' : 'Далее'}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
