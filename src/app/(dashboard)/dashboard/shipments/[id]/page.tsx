'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, MapPin, Calendar, Ship, Package, User, Building2,
  FileText, Image as ImageIcon, Download, Truck, Clock, CheckCircle2, Circle,
} from 'lucide-react'
import { getShipmentStatus, getShipmentProgress, type Shipment } from '@/types/database'

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const [shipment, setShipment] = useState<Shipment | null>(null)

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

  const timeline = isRussia ? [
    { label: 'Загрузка', date: shipment.departure_date, icon: Package, done: !!shipment.departure_date },
    { label: 'В пути', date: shipment.departure_date, icon: Truck, done: !!shipment.arrival_date },
    { label: 'Транзит КЗ', date: shipment.arrival_date, icon: MapPin, done: !!shipment.arrival_date },
    { label: 'Таможня', date: shipment.customs_date, icon: FileText, done: !!shipment.customs_date },
    { label: 'В пути в РФ', date: shipment.release_date, icon: Truck, done: !!shipment.release_date },
    { label: 'Доставлен в РФ', date: shipment.delivery_date, icon: CheckCircle2, done: !!shipment.delivery_date || shipment.is_completed },
  ] : [
    { label: 'Загрузка', date: shipment.departure_date, icon: Package, done: !!shipment.departure_date },
    { label: 'В пути', date: shipment.departure_date, icon: Truck, done: !!shipment.arrival_date },
    { label: 'На границе КЗ', date: shipment.arrival_date, icon: MapPin, done: !!shipment.arrival_date },
    { label: 'Таможня', date: shipment.customs_date, icon: FileText, done: !!shipment.customs_date },
    { label: 'Выдача', date: shipment.release_date, icon: CheckCircle2, done: !!shipment.release_date },
    { label: 'Доставлен', date: shipment.delivery_date, icon: CheckCircle2, done: !!shipment.delivery_date || shipment.is_completed },
  ]

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/shipments" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{shipment.container_number || 'Без номера'}</h1>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: status.color + '15', color: status.color }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.key === 'in_transit' ? 'status-dot-active' : ''}`} style={{ background: status.color }} />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {shipment.container_size ? `${shipment.container_size}ft` : ''} {shipment.container_type || ''} · {shipment.cargo_description || ''}
            </p>
          </div>
        </div>

        {shipment.contract_pdf && (
          <a
            href={shipment.contract_pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <FileText className="w-4 h-4" />
            Договор
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Прогресс доставки</span>
          <span className="text-sm font-bold text-slate-900">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${status.color}, ${status.color}cc)` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-5">Статус доставки</h3>
            <div className="space-y-0">
              {timeline.map((step, i) => {
                const isLast = i === timeline.length - 1
                return (
                  <div key={step.label} className="flex gap-3">
                    {/* Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        step.done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 ${step.done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4">
                      <p className={`text-sm font-medium ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{step.date || '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route & Info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Информация о перевозке</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow icon={MapPin} label="Откуда" value={shipment.origin} />
              <InfoRow icon={MapPin} label="Погранпереход" value={shipment.destination_station} />
              <InfoRow icon={MapPin} label="Город назначения" value={shipment.destination_city} />
              <InfoRow icon={Ship} label="Перевозчик" value={carrier?.name} />
              <InfoRow icon={User} label="Клиент" value={client?.name} badge={client?.is_russia ? '🇷🇺' : undefined} />
              <InfoRow icon={Building2} label="Получатель" value={recipient?.name} />
              <InfoRow icon={User} label="Отправитель" value={sender?.name} />
              <InfoRow icon={Package} label="Груз" value={shipment.cargo_description} />
            </div>
          </div>

          {/* Financial */}
          {(shipment.delivery_cost || shipment.price || shipment.invoice_amount) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Финансы</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shipment.delivery_cost && <FinanceCard label="Доставка" value={shipment.delivery_cost} />}
                {shipment.price && <FinanceCard label="Цена" value={shipment.price} />}
                {shipment.invoice_amount && <FinanceCard label="Счёт" value={shipment.invoice_amount} />}
                {shipment.client_payment && <FinanceCard label="Оплата клиента" value={shipment.client_payment} />}
                {shipment.customs_cost && <FinanceCard label="Таможня" value={shipment.customs_cost} />}
                {shipment.additional_cost && <FinanceCard label="Допол. расходы" value={shipment.additional_cost} />}
              </div>
              {shipment.weight_tons && (
                <p className="text-xs text-slate-400 mt-3">Вес: {shipment.weight_tons} т · Дней: {shipment.days_count || '—'}</p>
              )}
            </div>
          )}

          {/* Files */}
          {(shipment.photos?.length || shipment.excel_files?.length) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Файлы</h3>
              <div className="flex flex-wrap gap-3">
                {shipment.photos?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100">
                    <ImageIcon className="w-4 h-4" /> Фото {i + 1}
                  </a>
                ))}
                {shipment.excel_files?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors border border-slate-100">
                    <Download className="w-4 h-4" /> Excel {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
