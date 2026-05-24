import { assignUserRoles, loadUserPlatformRoles } from '@/lib/db/rbac-persistence'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'
import { updateAdminUser } from '@/lib/super-admin/users-admin'

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'users', 'manage_users', async (viewer, req) => {
    const { id } = await ctx.params
    let body: { roleIds?: string[]; primaryRoleId?: string }
    try {
      body = (await req.json()) as { roleIds?: string[]; primaryRoleId?: string }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const roleIds = Array.isArray(body.roleIds)
      ? body.roleIds.filter((x): x is string => typeof x === 'string')
      : []
    await assignUserRoles(id, roleIds, body.primaryRoleId ?? roleIds[0])
    const platformRoles = await loadUserPlatformRoles(id)
    const user = await updateAdminUser(id, {})
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'user.roles.assign',
      entityType: 'user',
      entityId: id,
      newValue: { roleIds },
      ...meta,
    })
    return Response.json({ ...user, platformRoles })
  })
}
