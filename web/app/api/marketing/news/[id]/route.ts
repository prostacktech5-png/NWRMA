import { deleteNewsPost, getNewsPostById, updateNewsPost } from '@/lib/marketing-news-store'
import { withMarketingNewsAdminApi } from '@/lib/marketing-news-api-auth'
import type { MarketingNewsPostInput } from '@/lib/marketing-site/news-types'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  return withMarketingNewsAdminApi(req, async () => {
    const { id } = await context.params
    let body: Partial<MarketingNewsPostInput>
    try {
      body = (await req.json()) as Partial<MarketingNewsPostInput>
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    const post = await updateNewsPost(id, body)
    if (!post) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ post })
  })
}

export async function DELETE(req: Request, context: RouteContext) {
  return withMarketingNewsAdminApi(req, async () => {
    const { id } = await context.params
    const ok = await deleteNewsPost(id)
    if (!ok) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ ok: true })
  })
}

export async function GET(req: Request, context: RouteContext) {
  return withMarketingNewsAdminApi(req, async () => {
    const { id } = await context.params
    const post = await getNewsPostById(id)
    if (!post) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ post })
  })
}
