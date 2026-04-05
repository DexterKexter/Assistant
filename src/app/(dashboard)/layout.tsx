'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ShipmentModalProvider } from '@/lib/shipment-modal'
import { ShipmentModalGlobal } from '@/components/shipment-modal-global'
import { TaskModalProvider } from '@/lib/task-modal'
import { TaskDetailGlobal } from '@/components/task-detail-global'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <ShipmentModalProvider>
      <TaskModalProvider>
        <div className="relative flex h-screen overflow-hidden">
          <div className="hidden md:block shrink-0">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          </div>
          <div
            className="flex flex-1 flex-col overflow-hidden min-w-0 bg-white md:rounded-[20px] md:-ml-4 md:my-3 md:mr-3 relative z-10"
            style={{ boxShadow: '-6px 0 30px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)' }}
          >
            <Header />
            <main className="flex-1 overflow-auto px-3 py-3 md:px-5 md:py-4 pb-20 md:pb-4 relative">
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
        <ShipmentModalGlobal />
        <TaskDetailGlobal />
      </TaskModalProvider>
    </ShipmentModalProvider>
  )
}
