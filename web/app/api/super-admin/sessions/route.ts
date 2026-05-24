import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { listUserSessions } from '@/lib/super-admin/session'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'audit', 'read', async () => {
    const userId = new URL(req.url).searchParams.get('userId')
    if (!userId) {
      return Response.json({ error: 'userId query param required' }, { status: 400 })
    }
    const sessions = await listUserSessions(userId)
    return Response.json({ items: sessions })
  })
}
