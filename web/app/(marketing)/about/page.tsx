import type { Metadata } from 'next'
import { AboutPage } from '@/components/marketing/pages/AboutPage'

export const metadata: Metadata = {
  title: 'About',
}

export default function AboutRoutePage() {
  return <AboutPage />
}
