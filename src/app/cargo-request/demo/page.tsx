import type { Metadata } from 'next'
import CargoRequestDemo from './request-form'

export const metadata: Metadata = {
  title: 'Заявка на груз — Logistics',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CargoRequestDemo />
}
