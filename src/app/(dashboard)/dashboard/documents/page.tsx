'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, ExternalLink, Plus, Maximize2, X } from 'lucide-react'
import type { Shipment } from '@/types/database'
import { useShipmentModal } from '@/lib/shipment-modal'

export default function DocumentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [allShipments, setAllShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [showAllContracts, setShowAllContracts] = useState(false)
  const [loading, setLoading] = useState(true)
  const { openShipment } = useShipmentModal()

  useEffect(() => {
    const supabase = createClient()
    supabase.from('shipments')
      .select('id, container_number, contract_pdf, excel_files, photos, departure_date, updated_at, client:clients(name), recipient:recipients(name)')
      .or('contract_pdf.not.is.null,excel_files.not.is.null,photos.not.is.null')
      .order('updated_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setShipments((data as unknown as Shipment[]) || [])
      })

    // All shipments for status table
    supabase.from('shipments')
      .select('id, container_number, contract_pdf, photos, departure_date, client:clients(name), recipient:recipients(name)')
      .not('departure_date', 'is', null)
      .order('departure_date', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setAllShipments((data as unknown as Shipment[]) || [])
        setLoading(false)
      })
  }, [])

  const contracts = shipments.filter(s => s.contract_pdf)
  const withPhotos = shipments.filter(s => s.photos?.length)

  const filteredContracts = search
    ? contracts.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
    : contracts

  const filteredPhotos = search
    ? withPhotos.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
    : withPhotos

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Документы</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{contracts.length} договоров · {withPhotos.length} с фото</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Поиск по контейнеру или клиенту..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg bg-white border border-slate-200/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-48 w-full rounded-xl" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Contracts & Invoices */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[14px] font-semibold text-slate-900">Договора и счета</h2>
              <div className="flex-1" />
              <button onClick={() => setShowAllContracts(true)} className="h-8 px-3 bg-slate-800 text-white rounded-lg text-[12px] font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5" /> Полный список
              </button>
            </div>
            {(() => {
              const shown = search
                ? contracts.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
                : contracts
              return shown.length === 0 ? (
              <p className="text-[13px] text-slate-400 py-6 text-center">Нет договоров</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {shown.map((s) => (
                  <div key={s.id} className="shrink-0 w-60 border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 font-mono truncate">{s.container_number}</p>
                        <p className="text-[11px] text-slate-500 font-medium uppercase truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{(s.recipient as unknown as { name: string })?.name || ''}</span>
                      <span>{s.departure_date ? s.departure_date.split('-').reverse().join('.') : ''}</span>
                    </div>
                    <div className="flex gap-2 mt-auto pt-3">
                      <a href={s.contract_pdf!} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[11px] font-medium hover:bg-slate-700 transition-colors">
                        <FileText className="w-3 h-3" /> Договор PDF
                      </a>
                      <button onClick={() => openShipment(s.id)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
            })()}
          </div>

          {/* Contracts modal */}
          {showAllContracts && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-8 overflow-y-auto" onClick={() => setShowAllContracts(false)}>
              <div className="bg-white rounded-2xl w-[90vw] max-w-5xl p-6 mb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[16px] font-bold text-slate-900">Все договора ({contracts.length})</h2>
                  <div className="flex-1" />
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                  </div>
                  <button onClick={() => setShowAllContracts(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {(search
                    ? contracts.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
                    : contracts
                  ).map((s) => (
                    <div key={s.id} className="flex items-center gap-4 py-2.5 px-1 hover:bg-slate-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-900 font-mono w-32 shrink-0">{s.container_number}</p>
                      <p className="text-[12px] text-slate-600 w-40 truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                      <p className="text-[12px] text-slate-400 flex-1 truncate">{(s.recipient as unknown as { name: string })?.name || ''}</p>
                      <p className="text-[12px] text-slate-400 w-24 text-right">{s.departure_date ? s.departure_date.split('-').reverse().join('.') : ''}</p>
                      <a href={s.contract_pdf!} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1 bg-slate-800 text-white rounded-md text-[11px] font-medium hover:bg-slate-700 transition-colors shrink-0">
                        PDF
                      </a>
                      <button onClick={() => { setShowAllContracts(false); openShipment(s.id) }}
                        className="p-1.5 hover:bg-slate-100 rounded-md transition-colors shrink-0">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[14px] font-semibold text-slate-900">Фото грузов</h2>
              <div className="flex-1" />
              <button className="h-8 px-3 bg-slate-100 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
              <button onClick={() => setShowAllPhotos(true)} className="h-8 px-3 bg-slate-800 text-white rounded-lg text-[12px] font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5" /> Полный список
              </button>
            </div>
            {(() => {
              const photoFiltered = search
                ? withPhotos.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
                : withPhotos
              const shown = photoFiltered.slice(0, 8)
              return shown.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-6 text-center">Нет фото</p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {shown.map((s) => (
                    <div key={s.id} className="group cursor-pointer" onClick={() => openShipment(s.id)}>
                      <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden">
                        <img src={s.photos![0]} alt={s.container_number || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2 uppercase">{(s.client as unknown as { name: string })?.name || '—'}</p>
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{s.container_number}</p>
                      <p className="text-[11px] text-slate-400">{(s.recipient as unknown as { name: string })?.name || ''} {s.departure_date ? `· ${s.departure_date.split('-').reverse().join('.')}` : ''}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Full photos modal */}
          {showAllPhotos && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-8 overflow-y-auto" onClick={() => setShowAllPhotos(false)}>
              <div className="bg-white rounded-2xl w-[90vw] max-w-5xl p-6 mb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[16px] font-bold text-slate-900">Все фото грузов ({withPhotos.length})</h2>
                  <div className="flex-1" />
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                  </div>
                  <button onClick={() => setShowAllPhotos(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(search
                    ? withPhotos.filter(s => (s.container_number || '').toLowerCase().includes(search.toLowerCase()) || ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(search.toLowerCase()))
                    : withPhotos
                  ).map((s) => (
                    <div key={s.id} className="group cursor-pointer" onClick={() => { setShowAllPhotos(false); openShipment(s.id) }}>
                      <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden">
                        <img src={s.photos![0]} alt={s.container_number || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-2 uppercase">{(s.client as unknown as { name: string })?.name || '—'}</p>
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{s.container_number}</p>
                      <p className="text-[11px] text-slate-400">{(s.recipient as unknown as { name: string })?.name || ''} {s.departure_date ? `· ${s.departure_date.split('-').reverse().join('.')}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Status table */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-slate-900">Статус документов</h2>
              <div className="flex-1" />
              <div className="relative w-96">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input type="text" placeholder="Поиск по контейнеру или клиенту..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200/60 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-2 text-[12px] font-semibold text-slate-500">Номер</th>
                  <th className="text-left px-3 py-2 text-[12px] font-semibold text-slate-500">Клиент</th>
                  <th className="text-left px-3 py-2 text-[12px] font-semibold text-slate-500">Получатель</th>
                  <th className="text-left px-3 py-2 text-[12px] font-semibold text-slate-500">Дата</th>
                  <th className="text-center px-3 py-2 text-[12px] font-semibold text-slate-500">Инвойс</th>
                  <th className="text-center px-3 py-2 text-[12px] font-semibold text-slate-500">Фото</th>
                </tr>
              </thead>
              <tbody>
                {allShipments
                  .filter(s => {
                    if (!search) return true
                    const q = search.toLowerCase()
                    return (s.container_number || '').toLowerCase().includes(q) ||
                      ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q) ||
                      ((s.recipient as unknown as { name: string })?.name || '').toLowerCase().includes(q)
                  })
                  .map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 cursor-pointer transition-colors"
                    onClick={() => openShipment(s.id)}>
                    <td className="px-5 py-2.5 text-[14px] font-bold text-slate-900 font-mono">{s.container_number}</td>
                    <td className="px-3 py-2.5 text-[14px] font-medium text-slate-900">{(s.client as unknown as { name: string })?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-[14px] text-slate-800">{(s.recipient as unknown as { name: string })?.name || ''}</td>
                    <td className="px-3 py-2.5 text-[14px] font-medium text-slate-800">{s.departure_date ? s.departure_date.split('-').reverse().join('.') : '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {s.contract_pdf ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600">Есть ✓</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-500">Нет ✕</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.photos?.length ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600">Есть ✓</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-500">Нет ✕</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
