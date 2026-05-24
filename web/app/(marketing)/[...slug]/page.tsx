import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingContent } from '@/components/marketing/MarketingContent'
import { getMarketingPage, listMarketingRoutes } from '@/lib/marketing-site/pages'

type PageProps = {
  params: Promise<{ slug: string[] }>
}

function routeFromSlug(slug: string[]): string {
  return '/' + slug.join('/')
}

export async function generateStaticParams() {
  return listMarketingRoutes().map((route) => ({
    slug: route.replace(/^\//, '').split('/').filter(Boolean),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getMarketingPage(routeFromSlug(slug))
  if (!page) return { title: 'Not found' }
  return { title: page.title }
}

export default async function MarketingContentPage({ params }: PageProps) {
  const { slug } = await params
  const page = getMarketingPage(routeFromSlug(slug))
  if (!page) notFound()
  return <MarketingContent html={page.html} />
}
