import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'
import { revokeSession } from '@/lib/super-admin/session'

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'audit', 'update', async (viewer, req) => {
    const { id } = await ctx.params
    await revokeSession(id)
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'session.revoke',
      entityType: 'user_session',
      entityId: id,
      ...meta,
    })
    return Response.json({ ok: true })
  })
}
