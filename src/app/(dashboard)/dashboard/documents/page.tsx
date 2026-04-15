'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, FileText, Image as ImageIcon, ExternalLink, X, Clock, CheckCircle2, Receipt, Camera } from 'lucide-react'
import type { Shipment } from '@/types/database'
import { getShipmentStatus } from '@/types/database'

function fmtDDMM(date: string | null | undefined) {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return d && m && y ? `${d}.${m}.${y.slice(2)}` : date
}
function daysSince(date: string | null | undefined) {
  if (!date) return 0
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}
import { useShipmentModal } from '@/lib/shipment-modal'

const STATUS_PAGE_SIZE = 50
// pagination enabled

export default function DocumentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [allShipments, setAllShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusPage, setStatusPage] = useState(1)
  const { openShipment } = useShipmentModal()

  // Reset pagination when search changes
  useEffect(() => { setStatusPage(1) }, [search])

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

    supabase.from('shipments')
      .select('id, container_number, contract_pdf, photos, departure_date, arrival_date, delivery_date, is_completed, client:clients(name, is_russia), recipient:recipients(name)')
      .not('departure_date', 'is', null)
      .order('departure_date', { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        setAllShipments((data as unknown as Shipment[]) || [])
        setLoading(false)
      })
  }, [])

  const contracts = shipments.filter(s => s.contract_pdf)
  const withPhotos = shipments.filter(s => s.photos?.length)

  const q = search.toLowerCase()
  const filterFn = (s: Shipment) => {
    if (!search) return true
    return (s.container_number || '').toLowerCase().includes(q) ||
      ((s.client as unknown as { name: string })?.name || '').toLowerCase().includes(q)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight font-heading">Документы</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{contracts.length} договоров · {withPhotos.length} с фото</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Поиск по контейнеру или клиенту..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg bg-white border border-slate-200/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Two columns: Contracts + Photos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contracts — vertical list desktop, horizontal carousel mobile */}
            <div className="md:bg-white md:rounded-2xl md:ring-1 md:ring-slate-900/[0.04] md:shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] md:overflow-hidden">
              <div className="flex items-center gap-2 px-1 pb-2 md:px-4 md:py-3 md:border-b md:border-slate-100">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-[13px] font-semibold text-slate-900">Договора и счета</h2>
                <span className="text-[11px] text-slate-400 ml-1">{contracts.length}</span>
              </div>
              {/* Desktop: vertical scroll list */}
              <div className="hidden md:block max-h-[400px] overflow-y-auto">
                {contracts.filter(filterFn).length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-8 text-center">Нет договоров</p>
                ) : contracts.filter(filterFn).map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => openShipment(s.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{s.container_number}</p>
                      <p className="text-[11px] text-slate-400 truncate">{(s.client as unknown as { name: string })?.name || '—'} · {(s.recipient as unknown as { name: string })?.name || ''}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{s.departure_date ? s.departure_date.split('-').reverse().join('.') : ''}</span>
                    <a href={s.contract_pdf!} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-[10px] font-medium hover:bg-slate-800 shrink-0">
                      PDF
                    </a>
                  </div>
                ))}
              </div>
              {/* Mobile: horizontal carousel */}
              <div className="md:hidden overflow-x-auto snap-x snap-mandatory">
                {contracts.filter(filterFn).length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-8 text-center">Нет договоров</p>
                ) : (
                  <div className="flex gap-2.5">
                    {contracts.filter(filterFn).map(s => (
                      <button
                        key={s.id}
                        onClick={() => openShipment(s.id)}
                        className="shrink-0 w-[180px] snap-start text-left active:opacity-70 transition-opacity"
                      >
                        <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-2">
                          <FileText className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-[12.5px] font-bold text-slate-900 font-mono truncate">{s.container_number}</p>
                        <p className="text-[11px] text-slate-500 truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                        <p className="text-[10px] text-slate-400">{s.departure_date ? s.departure_date.split('-').reverse().join('.') : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Photos — vertical list desktop, horizontal carousel mobile */}
            <div className="md:bg-white md:rounded-2xl md:ring-1 md:ring-slate-900/[0.04] md:shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] md:overflow-hidden">
              <div className="flex items-center gap-2 px-1 pb-2 md:px-4 md:py-3 md:border-b md:border-slate-100">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <h2 className="text-[13px] font-semibold text-slate-900">Фото грузов</h2>
                <span className="text-[11px] text-slate-400 ml-1">{withPhotos.length}</span>
              </div>
              {/* Desktop: vertical scroll list */}
              <div className="hidden md:block max-h-[400px] overflow-y-auto">
                {withPhotos.filter(filterFn).length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-8 text-center">Нет фото</p>
                ) : withPhotos.filter(filterFn).map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => openShipment(s.id)}>
                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      <img src={s.photos![0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 font-mono">{s.container_number}</p>
                      <p className="text-[11px] text-slate-400 truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{s.photos!.length} фото</span>
                  </div>
                ))}
              </div>
              {/* Mobile: horizontal carousel */}
              <div className="md:hidden overflow-x-auto snap-x snap-mandatory">
                {withPhotos.filter(filterFn).length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-8 text-center">Нет фото</p>
                ) : (
                  <div className="flex gap-2.5">
                    {withPhotos.filter(filterFn).map(s => (
                      <button
                        key={s.id}
                        onClick={() => openShipment(s.id)}
                        className="shrink-0 w-[140px] snap-start text-left active:opacity-70 transition-opacity"
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                          <img src={s.photos![0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          {s.photos!.length > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm">
                              {s.photos!.length}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-bold text-slate-900 font-mono truncate">{s.container_number}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">{(s.client as unknown as { name: string })?.name || '—'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recently added documents */}
          {(() => {
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30)
            const recentStr = sevenDaysAgo.toISOString().split('T')[0]
            const recent = allShipments.filter(s => {
              const hasNewDoc = (s.contract_pdf && s.updated_at > recentStr) || (s.photos?.length && s.updated_at > recentStr)
              return hasNewDoc
            }).slice(0, 8)

            if (recent.length === 0) return null

            return (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-[13px] font-semibold text-slate-900">Последние добавленные</h2>
                  <span className="text-[11px] text-slate-400 ml-1">за 30 дней</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
                  {recent.map(s => {
                    const hasContract = !!s.contract_pdf
                    const photoCount = s.photos?.length || 0
                    const clientName = (s.client as unknown as { name: string })?.name || '—'
                    return (
                      <div key={s.id} onClick={() => openShipment(s.id)}
                        className="flex items-center gap-3 px-4 py-3 border-b sm:border-r border-slate-100 last:border-b-0 hover:bg-slate-50/50 cursor-pointer transition-colors">
                        {photoCount > 0 ? (
                          <img src={s.photos![0]} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-mono font-semibold text-slate-800 truncate">{s.container_number}</p>
                          <p className="text-[10px] text-slate-400 truncate">{clientName}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasContract && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-semibold rounded">PDF</span>}
                          {photoCount > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-500 text-[8px] font-semibold rounded">{photoCount} фото</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Status table — full width (desktop table + mobile cards) */}
          {(() => {
            const filtered = allShipments.filter(filterFn)
            const totalPages = Math.max(1, Math.ceil(filtered.length / STATUS_PAGE_SIZE))
            const page = Math.min(statusPage, totalPages)
            const pageStart = (page - 1) * STATUS_PAGE_SIZE
            const pageItems = filtered.slice(pageStart, pageStart + STATUS_PAGE_SIZE)
            return (
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/[0.04] shadow-[0_1px_3px_0_rgba(15,23,42,0.03),0_4px_16px_-4px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-slate-900">Статус документов</h2>
              <span className="text-[11px] text-slate-400">
                {filtered.length > 0 && `${pageStart + 1}–${Math.min(pageStart + STATUS_PAGE_SIZE, filtered.length)} из ${filtered.length}`}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[600px]">
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
                  {pageItems.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 cursor-pointer transition-colors"
                      onClick={() => openShipment(s.id)}>
                      <td className="px-5 py-2.5 text-[13px] font-bold text-slate-900 font-mono">{s.container_number}</td>
                      <td className="px-3 py-2.5 text-[13px] text-slate-700">{(s.client as unknown as { name: string })?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-[13px] text-slate-600">{(s.recipient as unknown as { name: string })?.name || ''}</td>
                      <td className="px-3 py-2.5 text-[13px] text-slate-600">{s.departure_date ? s.departure_date.split('-').reverse().join('.') : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {s.contract_pdf ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">Есть</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-400">Нет</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.photos?.length ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">Есть</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-400">Нет</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden border-t border-slate-100 divide-y divide-slate-50">
              {pageItems.map(s => {
                const hasPdf = !!s.contract_pdf
                const hasPhoto = !!s.photos?.length
                const client = s.client as unknown as { name: string; is_russia?: boolean } | null
                const clientName = client?.name
                const recipientName = (s.recipient as unknown as { name: string })?.name
                const status = getShipmentStatus(s, client?.is_russia)

                // Right-side date/label logic:
                // delivered → date of delivery
                // on border / transit → arrival_date
                // in transit → days since departure
                let dateLabel = ''
                if (s.delivery_date || s.is_completed) {
                  dateLabel = s.delivery_date ? fmtDDMM(s.delivery_date) : 'Доставлен'
                } else if (s.arrival_date) {
                  dateLabel = fmtDDMM(s.arrival_date)
                } else if (s.departure_date) {
                  dateLabel = `${daysSince(s.departure_date)}д в пути`
                }

                return (
                  <button
                    key={s.id}
                    onClick={() => openShipment(s.id)}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-slate-50 transition-colors"
                  >
                    {/* Left: avatar circle with status color */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: status.color + '15', color: status.color }}
                    >
                      {status.key === 'delivered' ? <CheckCircle2 className="w-5 h-5" strokeWidth={2} /> : <Clock className="w-5 h-5" strokeWidth={2} />}
                    </div>

                    {/* Middle: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-slate-900 font-mono truncate">{s.container_number}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold shrink-0"
                          style={{ background: status.color + '18', color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-700 mt-0.5 truncate">{clientName || '—'}</p>
                      {recipientName && <p className="text-[11px] text-slate-400 truncate leading-tight">{recipientName}</p>}
                    </div>

                    {/* Right: date + docs dots */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {dateLabel && <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{dateLabel}</span>}
                      <div className="flex items-center gap-1">
                        <span
                          title={hasPdf ? 'Инвойс есть' : 'Нет инвойса'}
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${hasPdf ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}
                        >
                          <Receipt className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                        <span
                          title={hasPhoto ? 'Фото есть' : 'Нет фото'}
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${hasPhoto ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}
                        >
                          <Camera className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                <button
                  onClick={() => setStatusPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Назад
                </button>
                <span className="text-[12px] text-slate-500 font-medium">
                  Стр. {page} / {totalPages}
                </span>
                <button
                  onClick={() => setStatusPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Вперёд →
                </button>
              </div>
            )}
          </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
