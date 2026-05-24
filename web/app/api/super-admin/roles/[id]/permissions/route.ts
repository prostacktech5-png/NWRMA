import { setRolePermissions } from '@/lib/db/rbac-persistence'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'users', 'manage_users', async (viewer, req) => {
    const { id: roleId } = await ctx.params
    let body: { permissionIds?: string[] }
    try {
      body = (await req.json()) as { permissionIds?: string[] }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const permissionIds = Array.isArray(body.permissionIds)
      ? body.permissionIds.filter((x): x is string => typeof x === 'string')
      : []
    await setRolePermissions(roleId, permissionIds)
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'role.permissions.update',
      entityType: 'platform_role',
      entityId: roleId,
      newValue: { permissionIds },
      ...meta,
    })
    return Response.json({ ok: true, permissionIds })
  })
}
