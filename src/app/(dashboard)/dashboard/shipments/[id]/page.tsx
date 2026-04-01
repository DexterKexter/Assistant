'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, MapPin, Calendar, Ship, Package, User, Building2,
  FileText, Image as ImageIcon, Download, Truck, Clock, CheckCircle2, Circle,
  DollarSign, Wallet, Upload, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ShipmentMap = dynamic(() => import('@/components/shipment-map').then(m => ({ default: m.ShipmentMap })), { ssr: false })

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [tab, setTab] = useState<'shipment' | 'documents' | 'finance'>('shipment')
  const [photoIdx, setPhotoIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
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
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const client = shipment.client as unknown as { name: string; is_russia: boolean } | null
  const isRussia = client?.is_russia || false
  const status = getShipmentStatus(shipment, isRussia)
  const progress = getShipmentProgress(shipment)
  const recipient = shipment.recipient as unknown as { name: string } | null
  const sender = shipment.sender as unknown as { name: string } | null
  const carrier = shipment.carrier as unknown as { name: string } | null

  const days = (from: string | null, to: string | null) => {
    if (!from) return null
    const end = to ? new Date(to).getTime() : Date.now()
    return Math.round((end - new Date(from).getTime()) / 86400000)
  }

  const dep = shipment.departure_date
  const arr = shipment.arrival_date
  const del = shipment.delivery_date

  // Сроки для каждого этапа
  const loadingDays = dep ? (arr ? `${days(dep, arr)}д` : `${days(dep, null)}д`) : null
  const borderDays = arr ? (del ? `${days(arr, del)}д` : `${days(arr, null)}д`) : null
  const totalDays = dep && del ? `${days(dep, del)}д` : null

  const borderLabel = isRussia ? 'Транзит КЗ' : 'На границе КЗ'
  const deliveredLabel = isRussia ? 'Доставлен в РФ' : 'Доставлен'

  const timeline = [
    { label: 'Загрузка', date: dep, icon: Package, done: !!dep, days: loadingDays },
    { label: borderLabel, date: arr, icon: MapPin, done: !!arr, days: borderDays },
    { label: deliveredLabel, date: del, icon: CheckCircle2, done: !!del || shipment.is_completed, days: totalDays },
  ]

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <h1 className="text-[18px] font-bold text-slate-900 font-mono tracking-tight">{shipment.container_number || '—'}</h1>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: status.color + '15', color: status.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {[
          { key: 'shipment' as const, label: 'Перевозка', icon: Ship },
          { key: 'documents' as const, label: 'Документы', icon: FileText },
          { key: 'finance' as const, label: 'Финансы', icon: Wallet },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 pb-2.5 text-[13px] font-medium transition-all duration-150 border-b-2 -mb-px ${tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <t.icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shipment' && <>
        {/* Row 1: Details — two columns */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 px-6 py-5">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Контейнер</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DetailIcon icon={<Ship className="w-3.5 h-3.5" />} label="Номер" value={shipment.container_number || '—'} bold />
              <DetailIcon icon={<Package className="w-3.5 h-3.5" />} label="Размер" value={shipment.container_size ? `${shipment.container_size}ft` : '—'} />
              <DetailIcon icon={<FileText className="w-3.5 h-3.5" />} label="Тип" value={shipment.container_type || '—'} />
              <DetailIcon icon={<Package className="w-3.5 h-3.5" />} label="Груз" value={shipment.cargo_description || '—'} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-6 py-5">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Участники</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DetailIcon icon={<User className="w-3.5 h-3.5" />} label="Клиент" value={`${client?.name || '—'}${client?.is_russia ? ' 🇷🇺' : ''}`} />
              <DetailIcon icon={<Building2 className="w-3.5 h-3.5" />} label="Получатель" value={recipient?.name || '—'} />
              <DetailIcon icon={<User className="w-3.5 h-3.5" />} label="Отправитель" value={shipment.sender_name || sender?.name || '—'} />
              <DetailIcon icon={<Truck className="w-3.5 h-3.5" />} label="Перевозчик" value={carrier?.name || '—'} />
            </div>
          </div>
        </div>

        {/* Row 2: Route timeline */}
        <div className="bg-white rounded-xl border border-slate-100 px-6 py-6">
          <div className="flex items-start">
            {/* Point 1: Origin */}
            <div className="flex flex-col items-center text-center" style={{ width: '25%' }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${dep ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Package className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-bold text-slate-900 mt-2">{shipment.origin || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(dep)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Загрузка</p>
            </div>

            {/* Arrow 1: days to border */}
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${arr ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {loadingDays && (
                <div className={`mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold ${arr ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>{loadingDays}</div>
              )}
            </div>

            {/* Point 2: Border */}
            <div className="flex flex-col items-center text-center" style={{ width: '25%' }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${arr ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-bold text-slate-900 mt-2">{shipment.destination_station || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(arr)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{borderLabel}</p>
            </div>

            {/* Arrow 2: days to delivery */}
            <div className="flex-1 relative flex flex-col items-center" style={{ marginTop: 17 }}>
              <div className={`h-0.5 w-full rounded-full ${del ? 'bg-slate-400' : 'bg-slate-200'}`} />
              {borderDays && (
                <div className={`mt-2 px-2.5 py-1 rounded-full text-[12px] font-bold ${del ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>{borderDays}</div>
              )}
            </div>

            {/* Point 3: Destination */}
            <div className="flex flex-col items-center text-center" style={{ width: '25%' }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${del || shipment.is_completed ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-bold text-slate-900 mt-2">{shipment.destination_city || '—'}</p>
              <p className="text-[12px] text-slate-500">{fmtDate(del)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{deliveredLabel}</p>
            </div>
          </div>
        </div>

        {/* Row 3: Map */}
        <ShipmentMap
          origin={shipment.origin}
          border={shipment.destination_station}
          destination={shipment.destination_city}
          departureDate={shipment.departure_date}
          arrivalDate={shipment.arrival_date}
          deliveryDate={shipment.delivery_date}
        />
      </>}

      {tab === 'documents' && (
        <div className="grid grid-cols-[1fr_300px] gap-4 h-[calc(100vh-180px)]">
          {/* Photo carousel — left */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-slate-900">Фото</h3>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Загрузить
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !shipment) return
                  setUploading(true)
                  const supabase = createClient()
                  const path = `${shipment.id}/photos/${Date.now()}_${file.name}`
                  await supabase.storage.from('shipment-docs').upload(path, file)
                  const { data: { publicUrl } } = supabase.storage.from('shipment-docs').getPublicUrl(path)
                  const newPhotos = [...(shipment.photos || []), publicUrl]
                  await supabase.from('shipments').update({ photos: newPhotos }).eq('id', shipment.id)
                  setShipment({ ...shipment, photos: newPhotos })
                  setPhotoIdx(newPhotos.length - 1)
                  setUploading(false)
                }} />
              </label>
            </div>
            {shipment.photos?.length ? (
              <div className="relative flex-1 flex flex-col">
                <div className="flex-1 bg-slate-50 rounded-xl overflow-hidden cursor-pointer min-h-[300px]" onClick={() => setLightbox(true)}>
                  <img src={shipment.photos[photoIdx]} alt={`Фото ${photoIdx + 1}`} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                </div>
                {shipment.photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx(p => p > 0 ? p - 1 : shipment.photos!.length - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={() => setPhotoIdx(p => p < shipment.photos!.length - 1 ? p + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </>
                )}
                <div className="flex gap-2 justify-center mt-3">
                  {shipment.photos.map((url, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === photoIdx ? 'border-slate-800 ring-1 ring-slate-800/20' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={url} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="aspect-[16/9] bg-slate-50 rounded-xl flex flex-col items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[13px] text-slate-400 mb-3">Нет фото</p>
                <label className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm">
                  <Upload className="w-3.5 h-3.5" /> Добавить фото
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !shipment) return
                    setUploading(true)
                    const supabase = createClient()
                    const path = `${shipment.id}/photos/${Date.now()}_${file.name}`
                    await supabase.storage.from('shipment-docs').upload(path, file)
                    const { data: { publicUrl } } = supabase.storage.from('shipment-docs').getPublicUrl(path)
                    const newPhotos = [...(shipment.photos || []), publicUrl]
                    await supabase.from('shipments').update({ photos: newPhotos }).eq('id', shipment.id)
                    setShipment({ ...shipment, photos: newPhotos })
                    setUploading(false)
                  }} />
                </label>
              </div>
            )}
          </div>

          {/* Documents list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-slate-900">Файлы</h3>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Добавить
                <input type="file" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !shipment) return
                  setUploading(true)
                  const supabase = createClient()
                  const path = `${shipment.id}/docs/${Date.now()}_${file.name}`
                  await supabase.storage.from('shipment-docs').upload(path, file)
                  const { data: { publicUrl } } = supabase.storage.from('shipment-docs').getPublicUrl(path)
                  const newFiles = [...(shipment.excel_files || []), publicUrl]
                  await supabase.from('shipments').update({ excel_files: newFiles }).eq('id', shipment.id)
                  setShipment({ ...shipment, excel_files: newFiles })
                  setUploading(false)
                }} />
              </label>
            </div>
            {uploading && <p className="text-[12px] text-indigo-500 mb-2">Загрузка...</p>}
            <div className="space-y-2">
              {shipment.contract_pdf && (
                <a href={shipment.contract_pdf} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 truncate">Договор</p>
                    <p className="text-[11px] text-slate-400">PDF</p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {shipment.excel_files?.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 truncate">Упаковочный лист {i + 1}</p>
                    <p className="text-[11px] text-slate-400">Excel</p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ))}
              {!shipment.contract_pdf && !shipment.excel_files?.length && (
                <div className="py-8 flex flex-col items-center">
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-[13px] text-slate-400 mb-3">Нет файлов</p>
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Добавить файл
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !shipment) return
                      setUploading(true)
                      const supabase = createClient()
                      const path = `${shipment.id}/docs/${Date.now()}_${file.name}`
                      await supabase.storage.from('shipment-docs').upload(path, file)
                      const { data: { publicUrl } } = supabase.storage.from('shipment-docs').getPublicUrl(path)
                      const newFiles = [...(shipment.excel_files || []), publicUrl]
                      await supabase.from('shipments').update({ excel_files: newFiles }).eq('id', shipment.id)
                      setShipment({ ...shipment, excel_files: newFiles })
                      setUploading(false)
                    }} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-[14px] font-semibold text-slate-900 mb-4">Финансы</h3>
          {(shipment.delivery_cost || shipment.price || shipment.invoice_amount) ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {shipment.delivery_cost && <FinanceCard label="Доставка" value={shipment.delivery_cost} />}
                {shipment.price && <FinanceCard label="Цена" value={shipment.price} />}
                {shipment.invoice_amount && <FinanceCard label="Счёт" value={shipment.invoice_amount} />}
                {shipment.client_payment && <FinanceCard label="Оплата клиента" value={shipment.client_payment} />}
                {shipment.customs_cost && <FinanceCard label="Таможня" value={shipment.customs_cost} />}
                {shipment.additional_cost && <FinanceCard label="Допол. расходы" value={shipment.additional_cost} />}
              </div>
              {shipment.weight_tons && (
                <p className="text-[12px] text-slate-400 mt-3">Вес: {shipment.weight_tons} т · Дней: {shipment.days_count || '—'}</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-slate-400 py-8 text-center">Нет финансовых данных</p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && shipment.photos?.length && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Circle className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setPhotoIdx(p => p > 0 ? p - 1 : shipment.photos!.length - 1) }}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <img src={shipment.photos[photoIdx]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); setPhotoIdx(p => p < shipment.photos!.length - 1 ? p + 1 : 0) }}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="absolute bottom-4 text-white/60 text-[13px]">{photoIdx + 1} / {shipment.photos.length}</p>
        </div>
      )}

    </div>
  )
}

function InfoRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string | null | undefined; badge?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">
          {value || '—'} {badge && <span className="ml-1">{badge}</span>}
        </p>
      </div>
    </div>
  )
}

function FinanceCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">${value.toLocaleString()}</p>
    </div>
  )
}

function DetailIcon({ icon, label, value, bold }: { icon: React.ReactNode; label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className={`text-[15px] text-slate-900 mt-0.5 truncate ${bold ? 'font-bold font-mono' : 'font-semibold'}`}>{value}</p>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-[13px] font-medium text-slate-800 mt-0.5 truncate">{value}</p>
    </div>
  )
}
