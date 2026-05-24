import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'boreholes', 'update', async (viewer, req) => {
    const { id } = await ctx.params
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const sql = getSql()
    const functionalState =
      typeof body.functionalState === 'string' ? body.functionalState : undefined
    const licenseStatus =
      typeof body.licenseStatus === 'string' ? body.licenseStatus : undefined

    try {
      if (functionalState !== undefined) {
        await sql`
          UPDATE boreholes SET functional_state = ${functionalState}, updated_at = now()
          WHERE id = ${id}
        `
      }
      if (licenseStatus !== undefined) {
        await sql`
          UPDATE boreholes SET license_status = ${licenseStatus}, updated_at = now()
          WHERE id = ${id}
        `
      }
      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'borehole.update',
        entityType: 'borehole',
        entityId: id,
        newValue: body,
        ...meta,
      })
      return Response.json({ ok: true })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Boreholes table not available' }, { status: 503 })
      }
      throw e
    }
  })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'boreholes', 'delete', async (viewer, req) => {
    const { id } = await ctx.params
    const sql = getSql()
    try {
      await sql`
        UPDATE boreholes SET deleted_at = now(), archived_at = now() WHERE id = ${id}
      `
      await sql`
        INSERT INTO borehole_history (id, borehole_id, actor_id, event_type, summary)
        VALUES (${randomUUID()}, ${id}, ${viewer.id}, 'soft_delete', 'Soft deleted by super admin')
      `
      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'borehole.soft_delete',
        entityType: 'borehole',
        entityId: id,
        ...meta,
      })
      return Response.json({ ok: true })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Boreholes table not available' }, { status: 503 })
      }
      throw e
    }
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withSuperAdminAuth(req, 'boreholes', 'update', async (viewer, req) => {
    const { id } = await ctx.params
    const url = new URL(req.url)
    if (url.searchParams.get('action') !== 'restore') {
      return Response.json({ error: 'Use ?action=restore' }, { status: 400 })
    }
    const sql = getSql()
    try {
      await sql`
        UPDATE boreholes SET deleted_at = NULL, archived_at = NULL WHERE id = ${id}
      `
      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'borehole.restore',
        entityType: 'borehole',
        entityId: id,
        ...meta,
      })
      return Response.json({ ok: true })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Boreholes table not available' }, { status: 503 })
      }
      throw e
    }
  })
}
