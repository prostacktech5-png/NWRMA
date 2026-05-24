import 'server-only'

import { listPublishedNewsPosts, postToCardItem } from '@/lib/marketing-news-store'
import type { NewsItem } from '@/lib/marketing-site/news'

export async function getHomeNews(): Promise<NewsItem[]> {
  const posts = await listPublishedNewsPosts()
  return posts.slice(0, 4).map(postToCardItem)
}
