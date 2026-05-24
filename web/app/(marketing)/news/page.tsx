import type { Metadata } from 'next'
import { listPublishedNewsPosts, postToCardItem } from '@/lib/marketing-news-store'
import { NewsListingPage } from '@/components/marketing/pages/NewsListingPage'

export const metadata: Metadata = {
  title: 'News',
}

export default async function NewsRoutePage() {
  const posts = await listPublishedNewsPosts()
  const items = posts.map(postToCardItem)
  return <NewsListingPage items={items} />
}
