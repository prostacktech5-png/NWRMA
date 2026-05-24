import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'National Water Resources Management Agency — Sierra Leone',
    template: '%s | NWRMA Sierra Leone',
  },
  description:
    'The National Water Resources Management Agency (NWRMA) protects, manages and regulates surface and groundwater resources in Sierra Leone.',
}

/** Online forms — public marketing site is the tst/ React SPA served from web/public/. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children
}
