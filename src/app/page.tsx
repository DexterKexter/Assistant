import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Landing, landingMeta } from './landing'

export const metadata: Metadata = landingMeta('ru')

// One deployment serves both hosts: sti-cargo.com is the public site, crm.* (and Vercel URLs) the dashboard.
export default async function Home() {
  const host = (await headers()).get('host') || ''
  if (host.startsWith('crm.') || host.endsWith('.vercel.app')) redirect('/dashboard')
  return <Landing lang="ru" />
}
