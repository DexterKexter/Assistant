'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ShipmentModalProvider } from '@/lib/shipment-modal'
import { ShipmentModalGlobal } from '@/components/shipment-modal-global'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ShipmentModalProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-auto bg-[#f8fafc] px-3 py-3 md:px-5 md:py-4">
            {children}
          </main>
        </div>
      </div>
      <ShipmentModalGlobal />
    </ShipmentModalProvider>
  )
}
