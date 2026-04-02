'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface ShipmentModalContextType {
  openShipment: (id: string) => void
  createShipment: () => void
  closeShipment: () => void
  selectedId: string | null
  isCreating: boolean
}

const ShipmentModalContext = createContext<ShipmentModalContextType>({
  openShipment: () => {},
  createShipment: () => {},
  closeShipment: () => {},
  selectedId: null,
  isCreating: false,
})

export function useShipmentModal() {
  return useContext(ShipmentModalContext)
}

export function ShipmentModalProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <ShipmentModalContext.Provider value={{
      openShipment: (id) => { setSelectedId(id); setIsCreating(false) },
      createShipment: () => { setSelectedId(null); setIsCreating(true) },
      closeShipment: () => { setSelectedId(null); setIsCreating(false) },
      selectedId,
      isCreating,
    }}>
      {children}
    </ShipmentModalContext.Provider>
  )
}
