import type { Metadata } from 'next'
import { MarketingHeader } from '@/components/marketing/layout/Header'
import { MarketingFooter } from '@/components/marketing/layout/Footer'
import '@/styles/marketing/global.css'
import '@/styles/marketing/header.css'
import '@/styles/marketing/footer.css'

export const metadata: Metadata = {
  title: {
    default: 'National Water Resources Management Agency',
    template: '%s - National Water Resources Management Agency',
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <div className="canvas main-offset">
        {children}
        <MarketingFooter />
      </div>
    </>
  )
}
