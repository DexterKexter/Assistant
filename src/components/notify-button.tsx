'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { currentEvent, EVENT_LABELS } from '@/lib/shipment-notify'
import type { StatusShipment } from '@/lib/shipment-status'

// Sends the client a WhatsApp message about the shipment's current stage. A sent message cannot be recalled, so it asks first.
export function NotifyButton({ shipmentId, shipment, className }: { shipmentId: string; shipment: Pick<StatusShipment, 'departure_date' | 'arrival_date' | 'delivery_date' | 'is_completed'>; className?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const label = EVENT_LABELS[currentEvent(shipment)]

  async function send() {
    if (!confirm(`Отправить клиенту в WhatsApp уведомление «${label}»?\n\nОтозвать сообщение будет нельзя.`)) return
    setState('sending')
    const res = await fetch('/api/crm/notify-shipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentId }) }).catch(() => null)
    if (res?.ok) { setState('sent'); return }
    setState('idle')
    alert(`Не отправлено: ${res ? await res.text() : 'нет соединения'}`)
  }

  return (
    <button onClick={send} disabled={state !== 'idle'} title={`Отправить клиенту: ${label}`} className={className}>
      <Send className="w-3 h-3" />
      <span className="hidden sm:inline">{state === 'sending' ? 'Отправляем…' : state === 'sent' ? 'Отправлено' : 'Уведомить клиента'}</span>
    </button>
  )
}
