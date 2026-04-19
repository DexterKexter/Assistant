'use client'

import { useState } from 'react'
import { Mail, Eye, Code2, FileText, Smartphone, Monitor, Send, Copy, Check, Sparkles } from 'lucide-react'

export interface Template {
  id: string
  name: string
  description: string
  subject: string
  file: string
  features: string[]
  html: string
  text: string
  code: string
}

type View = 'preview' | 'code' | 'plain'
type Device = 'desktop' | 'mobile'

export function MailClient({ templates }: { templates: Template[] }) {
  const [activeId, setActiveId] = useState(templates[0].id)
  const [view, setView] = useState<View>('preview')
  const [device, setDevice] = useState<Device>('desktop')
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const active = templates.find(t => t.id === activeId)!

  const copyHtml = async () => {
    await navigator.clipboard.writeText(active.html)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fakeSend = () => {
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-indigo-500" strokeWidth={2} />
            <h1 className="text-[22px] font-bold text-slate-900 font-heading">Почта</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" /> React Email 6.0
            </span>
          </div>
          <p className="text-[13px] text-slate-500">
            Шаблоны писем с рендерингом в HTML для всех почтовых клиентов
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-sm p-3 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Шаблоны ({templates.length})
          </p>
          <div className="space-y-1">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveId(t.id); setView('preview') }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                  t.id === activeId
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <p className={`text-[13px] font-semibold leading-tight ${t.id === activeId ? 'text-indigo-900' : 'text-slate-900'}`}>
                  {t.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {t.description}
                </p>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 mt-3 pt-3 px-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Фичи v6
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span> Unified пакет <code className="text-[10px] bg-slate-100 px-1 rounded">react-email</code></li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span> Server-side рендер в HTML</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span> Tailwind поддержка</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span> CodeBlock с Prism</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">✓</span> Plain-text версия</li>
            </ul>
          </div>
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-sm flex flex-col overflow-hidden min-h-0">
          {/* Subject bar */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Тема</p>
              <p className="text-[14px] text-slate-900 font-semibold truncate">{active.subject}</p>
            </div>
            <button
              onClick={fakeSend}
              disabled={sent}
              className="px-3.5 py-2 bg-indigo-500 text-white rounded-lg text-[12px] font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {sent ? <><Check className="w-3.5 h-3.5" /> Отправлено</> : <><Send className="w-3.5 h-3.5" /> Тест</>}
            </button>
          </div>

          {/* Features row */}
          <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">Компоненты:</span>
            {active.features.map(f => (
              <span key={f} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                {f}
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1">
              {[
                { key: 'preview' as const, label: 'Превью', Icon: Eye },
                { key: 'code' as const, label: 'React', Icon: Code2 },
                { key: 'plain' as const, label: 'Plain text', Icon: FileText },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                    view === t.key
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <t.Icon className="w-3 h-3" strokeWidth={2} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {view === 'preview' && (
                <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setDevice('desktop')}
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${device === 'desktop' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    title="Десктоп"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDevice('mobile')}
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${device === 'mobile' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                    title="Мобильный"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {(view === 'preview' || view === 'code') && (
                <button
                  onClick={copyHtml}
                  className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100"
                >
                  {copied ? <><Check className="w-3 h-3" /> Скопировано</> : <><Copy className="w-3 h-3" /> HTML</>}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-50 min-h-0">
            {view === 'preview' && (
              <div className="flex justify-center p-4 md:p-8">
                <iframe
                  key={active.id + device}
                  srcDoc={active.html}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all"
                  style={{
                    width: device === 'mobile' ? 375 : '100%',
                    maxWidth: device === 'mobile' ? 375 : 800,
                    height: 800,
                  }}
                  title={active.name}
                />
              </div>
            )}

            {view === 'code' && (
              <pre className="p-5 text-[12px] leading-relaxed font-mono text-slate-200 bg-slate-900 m-4 rounded-xl overflow-x-auto">
                <code>{active.code}</code>
              </pre>
            )}

            {view === 'plain' && (
              <div className="p-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3">
                    Plain-text версия (для клиентов без HTML)
                  </p>
                  <pre className="text-[12px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {active.text}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
