'use client'

import { useShipmentModal } from '@/lib/shipment-modal'
import dynamic from 'next/dynamic'

const ShipmentDetailInlineLoader = dynamic(
  () => import('@/app/(dashboard)/dashboard/shipments/ShipmentDetailInline'),
  { ssr: false }
)

export function ShipmentModalGlobal() {
  const { selectedId, isCreating, closeShipment } = useShipmentModal()

  if (!selectedId && !isCreating) return null

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={closeShipment}
    >
      <div
        className="bg-[#f8fafc] rounded-2xl w-[95vw] max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col"
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
