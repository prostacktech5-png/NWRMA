import { coerceDepartmentSectionAccess } from '@/lib/department-section-access'
import { isValidAdminUserStatus, isValidJobTitle } from '@/lib/job-titles'
import { isValidErpDepartment } from '@/lib/org-departments'
import type { Department } from '@/lib/types'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'
import { revokeAllUserSessions } from '@/lib/super-admin/session'
import {
  softDeleteAdminUser,
  updateAdminUser,
} from '@/lib/super-admin/users-admin'

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'users', 'update', async (viewer, req) => {
    const { id } = await ctx.params
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const statusRaw = typeof body.status === 'string' ? body.status : undefined
    if (statusRaw !== undefined && !isValidAdminUserStatus(statusRaw)) {
      return Response.json(
        { error: 'Status must be active or disabled (blocked).' },
        { status: 400 },
      )
    }

    const jobTitleRaw =
      typeof body.jobTitle === 'string'
        ? body.jobTitle
        : body.jobTitle === null
          ? null
          : undefined
    if (jobTitleRaw !== undefined && jobTitleRaw !== null && !isValidJobTitle(jobTitleRaw)) {
      return Response.json({ error: 'Invalid job title.' }, { status: 400 })
    }

    let departmentSectionAccessPatch: Record<string, Record<string, boolean>> | null | undefined =
      undefined
    if ('departmentSectionAccess' in body) {
      const raw = body.departmentSectionAccess
      if (raw === null) {
        departmentSectionAccessPatch = null
      } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const out: Record<string, Record<string, boolean>> = {}
        for (const [deptKey, flags] of Object.entries(raw as Record<string, unknown>)) {
          if (!isValidErpDepartment(deptKey)) continue
          out[deptKey] = coerceDepartmentSectionAccess(
            deptKey as Exclude<Department, null>,
            flags,
          )
        }
        departmentSectionAccessPatch = out
      }
    }

    const updated = await updateAdminUser(id, {
      fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
      jobTitle: jobTitleRaw,
      role: typeof body.role === 'string' ? body.role : undefined,
      department:
        'department' in body
          ? body.department === null
            ? null
            : String(body.department)
          : undefined,
      status: statusRaw,
      mustChangePassword:
        typeof body.mustChangePassword === 'boolean' ? body.mustChangePassword : undefined,
      departmentSectionAccess: departmentSectionAccessPatch,
    })
    if (!updated) return Response.json({ error: 'User not found' }, { status: 404 })

    if (statusRaw === 'disabled') {
      await revokeAllUserSessions(id)
    }

    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      newValue: body,
      ...meta,
    })
    return Response.json(updated)
  })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'users', 'delete', async (viewer, req) => {
    const { id } = await ctx.params
    const ok = await softDeleteAdminUser(id)
    if (!ok) return Response.json({ error: 'User not found' }, { status: 404 })
    await revokeAllUserSessions(id)
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'user.soft_delete',
      entityType: 'user',
      entityId: id,
      ...meta,
    })
    return Response.json({ ok: true })
  })
}
