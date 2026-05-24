import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMarketingPage } from '@/lib/marketing-site/pages'
import { DataTableContent } from '@/components/marketing/pages/DataTableContent'
import { MapsPageContent } from '@/components/marketing/pages/MapsPageContent'
import { DATA_MAPS_ROUTE } from '@/lib/marketing-site/data-routes'
import './data-page.css'

export function createDataMetadata(route: string): Metadata {
  const page = getMarketingPage(route)
  return { title: page?.title ?? 'Data' }
}

export function DataPage({ route }: { route: string }) {
  const page = getMarketingPage(route)
  if (!page) notFound()

  const isMaps = route === DATA_MAPS_ROUTE

  return (
    <section className="data-page">
      <div className="data-page__inner">
        {isMaps ? (
          <MapsPageContent html={page.html} />
        ) : (
          <DataTableContent html={page.html} />
        )}
      </div>
    </section>
  )
}
