import { listAllNewsPosts, listPublishedNewsPosts, createNewsPost } from '@/lib/marketing-news-store'
import { withMarketingNewsAdminApi } from '@/lib/marketing-news-api-auth'
import type { MarketingNewsPostInput } from '@/lib/marketing-site/news-types'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const admin = url.searchParams.get('admin') === '1'
  if (admin) {
    return withMarketingNewsAdminApi(req, async () => {
      const posts = await listAllNewsPosts()
      return Response.json({ posts })
    })
  }
  const posts = await listPublishedNewsPosts()
  return Response.json({ posts })
}

export async function POST(req: Request) {
  return withMarketingNewsAdminApi(req, async () => {
    let body: MarketingNewsPostInput
    try {
      body = (await req.json()) as MarketingNewsPostInput
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    if (!body.title?.trim()) {
      return Response.json({ error: 'Title is required.' }, { status: 400 })
    }
    const post = await createNewsPost(body)
    return Response.json({ post }, { status: 201 })
  })
}
