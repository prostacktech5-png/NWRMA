import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { listLoginEvents } from '@/lib/super-admin/login-events'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'audit', 'read', async () => {
    const { id } = await ctx.params
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') ?? 50)
    const events = await listLoginEvents(id, limit)
    return Response.json({ items: events })
  })
}
