import type { Metadata } from 'next'
import { MarketingHome } from '@/components/marketing/home/MarketingHome'

export const metadata: Metadata = {
  title: {
    absolute: 'Home - National Water Resources Management Agency',
  },
}

export default function MarketingHomePage() {
  return <MarketingHome />
}
