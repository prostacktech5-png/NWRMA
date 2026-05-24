import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'
import { revokeAllUserSessions } from '@/lib/super-admin/session'
import { resetAdminUserPassword } from '@/lib/super-admin/users-admin'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'users', 'manage_users', async (viewer, req) => {
    const { id } = await ctx.params
    let body: { password?: string; revokeSessions?: boolean }
    try {
      body = (await req.json()) as { password?: string; revokeSessions?: boolean }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const password =
      typeof body.password === 'string' && body.password.length >= 8
        ? body.password
        : null
    if (!password) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const ok = await resetAdminUserPassword(id, password, true)
    if (!ok) return Response.json({ error: 'User not found' }, { status: 404 })
    if (body.revokeSessions !== false) await revokeAllUserSessions(id)
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'user.password.reset',
      entityType: 'user',
      entityId: id,
      ...meta,
    })
    return Response.json({ ok: true })
  })
}
