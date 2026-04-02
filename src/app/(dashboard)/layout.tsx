'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
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
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-auto bg-[#f8fafc] px-3 py-3 md:px-5 md:py-4 pb-20 md:pb-4">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
      <ShipmentModalGlobal />
    </ShipmentModalProvider>
  )
}
