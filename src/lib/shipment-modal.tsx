'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface ShipmentModalContextType {
  openShipment: (id: string) => void
  closeShipment: () => void
  selectedId: string | null
}

const ShipmentModalContext = createContext<ShipmentModalContextType>({
  openShipment: () => {},
  closeShipment: () => {},
  selectedId: null,
})

export function useShipmentModal() {
  return useContext(ShipmentModalContext)
}

export function ShipmentModalProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <ShipmentModalContext.Provider value={{
      openShipment: (id) => setSelectedId(id),
      closeShipment: () => setSelectedId(null),
      selectedId,
    }}>
      {children}
    </ShipmentModalContext.Provider>
  )
}
