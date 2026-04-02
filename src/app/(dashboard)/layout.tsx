'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ShipmentModalProvider } from '@/lib/shipment-modal'
import { ShipmentModalGlobal } from '@/components/shipment-modal-global'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ShipmentModalProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto bg-[#f8fafc] px-5 py-4">
            {children}
          </main>
        </div>
      </div>
      <ShipmentModalGlobal />
    </ShipmentModalProvider>
  )
}
