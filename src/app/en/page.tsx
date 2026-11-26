import type { Metadata } from 'next'
import { Landing, landingMeta } from '../landing'

export const metadata: Metadata = landingMeta('en')

export default function Page() {
  return <Landing lang="en" />
}
