import type { Metadata } from 'next'
import { ContactPage } from '@/components/marketing/pages/ContactPage'

export const metadata: Metadata = {
  title: 'Contact',
}

export default function ContactRoutePage() {
  return <ContactPage />
}
