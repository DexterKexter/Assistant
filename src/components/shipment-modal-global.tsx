'use client'

import { useEffect } from 'react'
import { useShipmentModal } from '@/lib/shipment-modal'
import dynamic from 'next/dynamic'

const ShipmentDetailInlineLoader = dynamic(
  () => import('@/app/(dashboard)/dashboard/shipments/ShipmentDetailInline'),
  {
    ssr: false,
    loading: () => <ShipmentDetailSkeleton />,
  }
)

function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
        <div className="h-5 w-36 rounded-md bg-slate-200" />
        <div className="h-5 w-20 rounded-full bg-slate-200" />
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-6 border-b border-slate-200 pb-2">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-4 w-20 rounded bg-slate-100" />
        <div className="h-4 w-16 rounded bg-slate-100" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-36 rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-sm" />
        <div className="h-36 rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-sm" />
      </div>
      <div className="h-20 rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-sm" />
      <div className="h-64 rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-sm" />
    </div>
  )
}

export function ShipmentModalGlobal() {
  const { selectedId, isCreating, closeShipment } = useShipmentModal()

  // Preload the shipment detail chunk on idle so the first open is instant
  useEffect(() => {
    const preload = () => {
      import('@/app/(dashboard)/dashboard/shipments/ShipmentDetailInline')
    }
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
    if (idle) idle(preload)
    else setTimeout(preload, 1500)
  }, [])

  if (!selectedId && !isCreating) return null

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
      onClick={closeShipment}
    >
      <div
        className="bg-[#f8fafc] w-full h-full md:rounded-2xl md:w-[95vw] md:max-w-6xl md:h-[90vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-auto px-5 py-4">
          <ShipmentDetailInlineLoader
            id={selectedId || ''}
            mode={isCreating ? 'create' : 'view'}
            onClose={closeShipment}
          />
        </div>
      </div>
    </div>
  )
}
