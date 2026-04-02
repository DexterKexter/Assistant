'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Ship, ArrowRight, X, Filter, Package, FileText, Wallet, User, Building2, Truck, Pencil } from 'lucide-react'
import { getShipmentStatus, type Shipment } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import { DetailIcon } from '@/components/detail-icon'

const ShipmentMap = dynamic(() => import('@/components/shipment-map').then(m => ({ default: m.ShipmentMap })), { ssr: false })

export default function ShipmentDetailInline({ id, onClose }: { id: string; onClose: () => void }) {
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [tab, setTab] = useState<'shipment' | 'documents' | 'finance'>('shipment')
  const [photoIdx, setPhotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('shipments')
      .select('*, recipient:recipients(name), client:clients(name, is_russia), sender:senders(name), carrier:carriers(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => setShipment(data as unknown as Shipment))
  }, [id])

  if (!shipment) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const client = shipment.client as unknown as { name: string; is_russia: boolean } | null
  const isRussia = client?.is_russia || false
  const status = getShipmentStatus(shipment, isRussia)
  const recipient = shipment.recipient as unknown as { name: string } | null
  const carrier = shipment.carrier as unknown as { name: string } | null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <h1 className="text-[18px] font-bold text-slate-900 font-mono">{shipment.container_number}</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: status.color + '15', color: status.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>
        <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[12px] font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5">
          <Pencil className="w-3 h-3" />
          Редактировать
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {([
          { key: 'shipment' as const, label: 'Перевозка', Icon: Package },
          { key: 'documents' as const, label: 'Документы', Icon: FileText },
          { key: 'finance' as const, label: 'Финансы', Icon: Wallet },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 pb-2 text-[13px] font-medium border-b-2 -mb-px transition-all ${tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <t.Icon className="w-3.5 h-3.5" strokeWidth={tab === t.key ? 2.2 : 1.6} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'shipment' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-3">Контейнер</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DetailIcon icon={<Ship className="w-3.5 h-3.5" />} label="Номер" value={shipment.container_number || '—'} bold />
              <DetailIcon icon={<Package className="w-3.5 h-3.5" />} label="Размер" value={shipment.container_size ? `${shipment.container_size}ft` : '—'} />
              <DetailIcon icon={<FileText className="w-3.5 h-3.5" />} label="Тип" value={shipment.container_type || '—'} />
              <DetailIcon icon={<Package className="w-3.5 h-3.5" />} label="Груз" value={shipment.cargo_description || '—'} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-3">Участники</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DetailIcon icon={<User className="w-3.5 h-3.5" />} label="Клиент" value={`${client?.name || '—'}${client?.is_russia ? ' 🇷🇺' : ''}`} />
              <DetailIcon icon={<Building2 className="w-3.5 h-3.5" />} label="Получатель" value={recipient?.name || '—'} />
              <DetailIcon icon={<User className="w-3.5 h-3.5" />} label="Отправитель" value={shipment.sender_name || '—'} />
              <DetailIcon icon={<Truck className="w-3.5 h-3.5" />} label="Перевозчик" value={carrier?.name || '—'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'shipment' && (
        <div className="bg-white rounded-xl border border-slate-100 px-6 py-4">
          <div className="flex items-start">
            <div className="flex-1 text-center">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center mx-auto"><Ship className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.origin || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.departure_date)}</p>
            </div>
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${shipment.arrival_date ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {shipment.departure_date && <div className="mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-700">{(() => { if (!shipment.departure_date) return ''; const end = shipment.arrival_date ? new Date(shipment.arrival_date).getTime() : Date.now(); return Math.round((end - new Date(shipment.departure_date).getTime()) / 86400000) + 'д' })()}</div>}
            </div>
            <div className="flex-1 text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${shipment.arrival_date ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Filter className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.destination_station || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.arrival_date)}</p>
            </div>
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${shipment.delivery_date ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {shipment.arrival_date && <div className="mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-700">{(() => { const end = shipment.delivery_date ? new Date(shipment.delivery_date).getTime() : Date.now(); return Math.round((end - new Date(shipment.arrival_date!).getTime()) / 86400000) + 'д' })()}</div>}
            </div>
            <div className="flex-1 text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto ${shipment.delivery_date || shipment.is_completed ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-400'}`}><Ship className="w-4 h-4" /></div>
              <p className="text-[14px] font-bold text-slate-900 mt-2">{shipment.destination_city || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(shipment.delivery_date)}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'shipment' && (
        <div className="rounded-xl overflow-hidden border border-slate-100" style={{ height: 200 }}>
          <ShipmentMap
            origin={shipment.origin}
            border={shipment.destination_station}
            destination={shipment.destination_city}
            departureDate={shipment.departure_date}
            arrivalDate={shipment.arrival_date}
            deliveryDate={shipment.delivery_date}
          />
        </div>
      )}

      {tab === 'finance' && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="grid grid-cols-3 gap-3">
            {shipment.delivery_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Доставка</p><p className="text-[18px] font-bold text-slate-900">${shipment.delivery_cost.toLocaleString()}</p></div>}
            {shipment.price && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Цена</p><p className="text-[18px] font-bold text-slate-900">${shipment.price.toLocaleString()}</p></div>}
            {shipment.invoice_amount && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Счёт</p><p className="text-[18px] font-bold text-slate-900">${shipment.invoice_amount.toLocaleString()}</p></div>}
            {shipment.customs_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Таможня</p><p className="text-[18px] font-bold text-slate-900">${shipment.customs_cost.toLocaleString()}</p></div>}
            {shipment.additional_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[11px] text-slate-400">Доп. расходы</p><p className="text-[18px] font-bold text-slate-900">${shipment.additional_cost.toLocaleString()}</p></div>}
          </div>
          {!shipment.delivery_cost && !shipment.price && !shipment.invoice_amount && <p className="text-[13px] text-slate-400 py-8 text-center">Нет данных</p>}
        </div>
      )}

      {tab === 'documents' && (() => {
        const photos = shipment.photos || []
        const excelFiles = shipment.excel_files || []
        const hasFiles = shipment.contract_pdf || excelFiles.length
        const curPhoto = photos[photoIdx] || null
        return (
          <div className="flex gap-3" style={{ height: 'calc(90vh - 165px)' }}>
            {photos.length > 0 ? (
              <div className="flex-[4] flex flex-col bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="flex-1 relative overflow-hidden cursor-zoom-in bg-slate-50" onClick={() => setLightbox(true)}>
                  <img src={curPhoto!} alt="" className="w-full h-full object-contain" />
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-1.5 p-2 border-t border-slate-100 bg-white overflow-x-auto shrink-0">
                    {photos.map((url, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        className={`w-14 h-14 rounded-md overflow-hidden shrink-0 border-2 transition-all ${i === photoIdx ? 'border-slate-700' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-[4] flex items-center justify-center bg-white rounded-xl border border-slate-100">
                <p className="text-[13px] text-slate-400">Нет фотографий</p>
              </div>
            )}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-100 p-3 overflow-y-auto">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-3">Файлы</p>
              {shipment.contract_pdf && (
                <a href={shipment.contract_pdf} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2">
                  <div className="w-7 h-6 rounded-md bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">Договор</p>
                    <p className="text-[10px] text-slate-400">PDF</p>
                  </div>
                </a>
              )}
              {excelFiles.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 border border-slate-100 mb-2">
                  <div className="w-7 h-6 rounded-md bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">Упаковочный лист {i + 1}</p>
                    <p className="text-[10px] text-slate-400">Excel</p>
                  </div>
                </a>
              ))}
              {!hasFiles && <p className="text-[12px] text-slate-400 text-center py-4">Нет файлов</p>}
            </div>
          </div>
        )
      })()}

      {/* Lightbox */}
      {lightbox && shipment.photos?.length && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          {photoIdx > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx(i => i - 1) }}>
              <ArrowRight className="w-5 h-5 text-white rotate-180" />
            </button>
          )}
          {photoIdx < shipment.photos.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx(i => i + 1) }}>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          )}
          <img src={shipment.photos[photoIdx]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
