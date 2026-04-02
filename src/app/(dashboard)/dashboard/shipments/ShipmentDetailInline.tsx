'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Ship, ArrowRight, X, Filter, Package, FileText, Wallet, User, Building2, Truck, Pencil, Check, Save, Trash2 } from 'lucide-react'
import { getShipmentStatus, type Shipment } from '@/types/database'
import { fmtDate } from '@/lib/utils'
import { DetailIcon } from '@/components/detail-icon'
import { useProfile } from '@/lib/useProfile'
import { SearchableSelect } from '@/components/searchable-select'

const ShipmentMap = dynamic(() => import('@/components/shipment-map').then(m => ({ default: m.ShipmentMap })), { ssr: false })

interface Lookups {
  clients: { id: string; name: string }[]
  carriers: { id: string; name: string }[]
  recipients: { id: string; name: string }[]
  senders: { id: string; name: string }[]
  refs: Record<string, string[]>
}

const CONTAINER_TYPES = ['Выкупной', 'Возвратный', 'Собственный', 'Малшы']

export default function ShipmentDetailInline({ id, mode = 'view', onClose }: { id: string; mode?: 'view' | 'create'; onClose: () => void }) {
  const isCreateMode = mode === 'create'
  const [shipment, setShipment] = useState<Shipment | null>(isCreateMode ? ({} as Shipment) : null)
  const [tab, setTab] = useState<'shipment' | 'documents' | 'finance'>('shipment')
  const [photoIdx, setPhotoIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  // Edit mode
  const { hasRole } = useProfile()
  const canEdit = hasRole('admin', 'manager')
  const [editing, setEditing] = useState(isCreateMode)
  const [draft, setDraft] = useState<Record<string, unknown>>(isCreateMode ? { container_size: '40', container_type: 'Выкупной', is_completed: false } : {})
  const [saving, setSaving] = useState(false)
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  // Fetch existing shipment (edit mode)
  useEffect(() => {
    if (isCreateMode) return
    supabase
      .from('shipments')
      .select('*, recipient:recipients(name), client:clients(name, is_russia), sender:senders(name), carrier:carriers(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => setShipment(data as unknown as Shipment))
  }, [id])

  // Fetch lookups on create mode mount
  useEffect(() => {
    if (isCreateMode && !lookups) {
      Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('recipients').select('id, name').order('name'),
        supabase.from('senders').select('id, name').order('name'),
        supabase.from('reference_items').select('category, name').order('name'),
      ]).then(([{ data: cl }, { data: ca }, { data: re }, { data: se }, { data: refData }]) => {
        const refs: Record<string, string[]> = {}
        ;(refData || []).forEach((r: { category: string; name: string }) => {
          if (!refs[r.category]) refs[r.category] = []
          refs[r.category].push(r.name)
        })
        setLookups({ clients: cl || [], carriers: ca || [], recipients: re || [], senders: se || [], refs })
      })
    }
  }, [isCreateMode])

  const setField = (field: string, value: unknown) => setDraft(prev => ({ ...prev, [field]: value }))

  const enterEditMode = async () => {
    if (!shipment) return
    // Copy editable fields to draft
    setDraft({
      container_number: shipment.container_number || '',
      container_size: shipment.container_size || '',
      container_type: shipment.container_type || '',
      cargo_description: shipment.cargo_description || '',
      client_id: shipment.client_id || '',
      recipient_id: shipment.recipient_id || '',
      sender_name: shipment.sender_name || '',
      carrier_id: shipment.carrier_id || '',
      origin: shipment.origin || '',
      destination_station: shipment.destination_station || '',
      destination_city: shipment.destination_city || '',
      departure_date: shipment.departure_date || '',
      arrival_date: shipment.arrival_date || '',
      delivery_date: shipment.delivery_date || '',
      delivery_cost: shipment.delivery_cost ?? '',
      price: shipment.price ?? '',
      invoice_amount: shipment.invoice_amount ?? '',
      client_payment: shipment.client_payment ?? '',
      customs_cost: shipment.customs_cost ?? '',
      weight_tons: shipment.weight_tons ?? '',
      additional_cost: shipment.additional_cost ?? '',
      notes: shipment.notes || '',
      is_completed: shipment.is_completed || false,
    })
    setEditing(true)

    // Fetch lookups if not loaded
    if (!lookups) {
      const [{ data: cl }, { data: ca }, { data: re }, { data: se }, { data: refData }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('carriers').select('id, name').order('name'),
        supabase.from('recipients').select('id, name').order('name'),
        supabase.from('senders').select('id, name').order('name'),
        supabase.from('reference_items').select('category, name').order('name'),
      ])
      const refs: Record<string, string[]> = {}
      ;(refData || []).forEach((r: { category: string; name: string }) => {
        if (!refs[r.category]) refs[r.category] = []
        refs[r.category].push(r.name)
      })
      setLookups({
        clients: cl || [],
        carriers: ca || [],
        recipients: re || [],
        senders: se || [],
        refs,
      })
    }
  }

  const cancelEdit = () => {
    if (isCreateMode) { onClose(); return }
    setEditing(false)
    setDraft({})
  }

  const handleSave = async () => {
    setSaving(true)

    const numFields = ['container_size', 'delivery_cost', 'price', 'invoice_amount', 'client_payment', 'customs_cost', 'weight_tons', 'additional_cost']
    const dateFields = ['departure_date', 'arrival_date', 'delivery_date']

    // Build clean payload
    const payload: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(draft)) {
      let newVal: unknown = val
      if (numFields.includes(key)) {
        newVal = val === '' || val === null ? null : Number(val)
      }
      if (dateFields.includes(key)) {
        newVal = val === '' ? null : val
      }
      if (key === 'is_completed') {
        newVal = !!val
      }
      if (key === 'client_id' || key === 'carrier_id' || key === 'recipient_id' || key === 'sender_id') {
        newVal = val === '' ? null : val
      }

      if (isCreateMode) {
        // Include all non-empty fields for insert
        if (newVal !== '' && newVal !== null) payload[key] = newVal
      } else {
        // Only changed fields for update
        const orig = (shipment as unknown as Record<string, unknown>)[key]
        const origNorm = orig === null || orig === undefined ? (numFields.includes(key) || dateFields.includes(key) ? null : '') : orig
        if (newVal !== origNorm) payload[key] = newVal
      }
    }

    if (isCreateMode) {
      const { data, error } = await supabase.from('shipments').insert(payload).select('id').single()
      if (error) {
        console.error('Create error:', error)
        setSaving(false)
        return
      }
      // Close and reload page
      setSaving(false)
      onClose()
      window.location.reload()
      return
    }

    if (Object.keys(payload).length > 0 && shipment) {
      const { error } = await supabase.from('shipments').update(payload).eq('id', shipment.id)
      if (error) {
        console.error('Save error:', error)
        setSaving(false)
        return
      }
    }

    // Re-fetch with joins
    const { data } = await supabase
      .from('shipments')
      .select('*, recipient:recipients(name), client:clients(name, is_russia), sender:senders(name), carrier:carriers(name)')
      .eq('id', id)
      .single()
    if (data) setShipment(data as unknown as Shipment)

    setEditing(false)
    setDraft({})
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!shipment || deleteConfirm !== shipment.container_number) return
    setDeleting(true)
    await supabase.from('shipments').delete().eq('id', shipment.id)
    setDeleting(false)
    onClose()
    window.location.reload()
  }

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

  // Shared input styles
  const inputCls = 'w-full text-[13px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all'

  // EditField: renders DetailIcon in view, input in edit
  function EditField({ icon, label, field, type = 'text', options, refCategory, displayValue, bold }: {
    icon: React.ReactNode; label: string; field: string;
    type?: 'text' | 'number' | 'date' | 'select' | 'ref';
    options?: { value: string; label: string }[];
    refCategory?: string;
    displayValue?: string; bold?: boolean
  }) {
    if (!editing) {
      const val = displayValue ?? String((shipment as unknown as Record<string, unknown>)[field] || '—')
      return <DetailIcon icon={icon} label={label} value={val} bold={bold} />
    }
    const raw = draft[field] ?? ''
    const refOptions = refCategory && lookups?.refs[refCategory]
      ? lookups.refs[refCategory].map(n => ({ value: n, label: n }))
      : []
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-slate-500 font-medium mb-0.5">{label}</p>
          {type === 'select' && options ? (
            <SearchableSelect
              options={options}
              value={String(raw)}
              onChange={v => setField(field, v)}
              placeholder="— Не выбрано —"
            />
          ) : type === 'ref' && refCategory ? (
            <SearchableSelect
              options={refOptions}
              value={String(raw)}
              onChange={v => setField(field, v)}
              placeholder="— Выберите —"
            />
          ) : (
            <input
              type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
              className={inputCls}
              value={String(raw)}
              onChange={e => setField(field, e.target.value)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <h1 className="text-[18px] font-bold text-slate-900 font-mono">{isCreateMode ? 'Новая перевозка' : shipment.container_number}</h1>
          {!isCreateMode && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: status.color + '15', color: status.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
              {status.label}
            </span>
          )}
        </div>
        {canEdit && !editing && (
          <button onClick={enterEditMode} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[12px] font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <Pencil className="w-3 h-3" />
            Редактировать
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            {!isCreateMode && (
              <button onClick={() => setShowDelete(true)} className="px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg text-[12px] font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5">
                <Trash2 className="w-3 h-3" />
                Удалить
              </button>
            )}
            <button onClick={cancelEdit} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg text-[12px] font-medium hover:bg-slate-50 transition-colors">
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-[12px] font-medium hover:bg-indigo-600 transition-colors flex items-center gap-1.5 disabled:opacity-50">
              <Save className="w-3 h-3" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
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

      {/* === SHIPMENT TAB === */}
      {tab === 'shipment' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Контейнер</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <EditField icon={<Ship className="w-3.5 h-3.5" />} label="Номер" field="container_number" bold />
              <EditField icon={<Package className="w-3.5 h-3.5" />} label="Размер" field="container_size" type="select"
                options={[{ value: '20', label: '20ft' }, { value: '40', label: '40ft' }]}
                displayValue={shipment.container_size ? `${shipment.container_size}ft` : '—'} />
              <EditField icon={<FileText className="w-3.5 h-3.5" />} label="Тип" field="container_type" type="select"
                options={CONTAINER_TYPES.map(t => ({ value: t, label: t }))} />
              <EditField icon={<Package className="w-3.5 h-3.5" />} label="Груз" field="cargo_description" type="ref" refCategory="cargo" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Участники</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <EditField icon={<User className="w-3.5 h-3.5" />} label="Клиент" field="client_id" type="select"
                options={lookups?.clients.map(c => ({ value: c.id, label: c.name })) || []}
                displayValue={`${client?.name || '—'}${client?.is_russia ? ' 🇷🇺' : ''}`} />
              <EditField icon={<Building2 className="w-3.5 h-3.5" />} label="Получатель" field="recipient_id" type="select"
                options={lookups?.recipients.map(r => ({ value: r.id, label: r.name })) || []}
                displayValue={recipient?.name || '—'} />
              <EditField icon={<User className="w-3.5 h-3.5" />} label="Отправитель" field="sender_name" type="ref" refCategory="sender" />
              <EditField icon={<Truck className="w-3.5 h-3.5" />} label="Перевозчик" field="carrier_id" type="select"
                options={lookups?.carriers.map(c => ({ value: c.id, label: c.name })) || []}
                displayValue={carrier?.name || '—'} />
            </div>
          </div>
        </div>
      )}

      {/* Route — view mode: timeline, edit mode: simple grid */}
      {tab === 'shipment' && !editing && (
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

      {tab === 'shipment' && editing && (
        <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
          <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Маршрут</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <EditField icon={<Ship className="w-3.5 h-3.5" />} label="Откуда" field="origin" type="ref" refCategory="city" />
            <EditField icon={<Filter className="w-3.5 h-3.5" />} label="Погранпереход" field="destination_station" type="ref" refCategory="station" />
            <EditField icon={<Ship className="w-3.5 h-3.5" />} label="Город назначения" field="destination_city" type="ref" refCategory="city" />
            <EditField icon={<Ship className="w-3.5 h-3.5" />} label="Дата отправки" field="departure_date" type="date" />
            <EditField icon={<Filter className="w-3.5 h-3.5" />} label="Дата на границе" field="arrival_date" type="date" />
            <EditField icon={<Check className="w-3.5 h-3.5" />} label="Дата доставки" field="delivery_date" type="date" />
          </div>
        </div>
      )}

      {/* Map — hide in edit mode */}
      {tab === 'shipment' && !editing && (
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

      {/* Notes + completed — edit mode only */}
      {tab === 'shipment' && editing && (
        <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
          <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Дополнительно</p>
          <div className="space-y-3">
            <div>
              <p className="text-[12px] text-slate-500 mb-1">Заметки</p>
              <textarea className={inputCls + ' min-h-[60px] resize-y'} value={String(draft.notes || '')} onChange={e => setField('notes', e.target.value)} placeholder="Заметки..." />
            </div>
          </div>
        </div>
      )}

      {/* === FINANCE TAB === */}
      {tab === 'finance' && !editing && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="grid grid-cols-3 gap-3">
            {shipment.delivery_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[12px] text-slate-500">Доставка</p><p className="text-[18px] font-bold text-slate-900">${shipment.delivery_cost.toLocaleString()}</p></div>}
            {shipment.price && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[12px] text-slate-500">Цена</p><p className="text-[18px] font-bold text-slate-900">${shipment.price.toLocaleString()}</p></div>}
            {shipment.invoice_amount && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[12px] text-slate-500">Счёт</p><p className="text-[18px] font-bold text-slate-900">${shipment.invoice_amount.toLocaleString()}</p></div>}
            {shipment.customs_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[12px] text-slate-500">Таможня</p><p className="text-[18px] font-bold text-slate-900">${shipment.customs_cost.toLocaleString()}</p></div>}
            {shipment.additional_cost && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[12px] text-slate-500">Доп. расходы</p><p className="text-[18px] font-bold text-slate-900">${shipment.additional_cost.toLocaleString()}</p></div>}
          </div>
          {!shipment.delivery_cost && !shipment.price && !shipment.invoice_amount && <p className="text-[13px] text-slate-400 py-8 text-center">Нет данных</p>}
        </div>
      )}

      {tab === 'finance' && editing && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Финансы</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { field: 'delivery_cost', label: 'Доставка' },
              { field: 'price', label: 'Цена' },
              { field: 'invoice_amount', label: 'Счёт' },
              { field: 'client_payment', label: 'Оплата клиента' },
              { field: 'customs_cost', label: 'Таможня' },
              { field: 'weight_tons', label: 'Вес (тонн)' },
              { field: 'additional_cost', label: 'Доп. расходы' },
            ].map(f => (
              <div key={f.field}>
                <p className="text-[12px] text-slate-500 mb-1">{f.label}</p>
                <input type="number" className={inputCls} value={String(draft[f.field] ?? '')} onChange={e => setField(f.field, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === DOCUMENTS TAB === */}
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
              <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-3">Файлы</p>
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

      {/* Delete confirmation modal */}
      {showDelete && shipment && (
        <div className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Удалить перевозку?</h3>
                <p className="text-[12px] text-slate-400">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600 mb-3">
              Для подтверждения введите номер контейнера: <span className="font-mono font-bold text-slate-900">{shipment.container_number}</span>
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={shipment.container_number || ''}
              className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-300 font-mono mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDelete(false); setDeleteConfirm('') }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">
                Отмена
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirm !== shipment.container_number}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-[13px] font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
