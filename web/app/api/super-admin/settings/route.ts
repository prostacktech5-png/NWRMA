import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'system', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`SELECT key, value, updated_at FROM platform_settings`
      const settings: Record<string, unknown> = {}
      for (const r of rows) {
        const row = r as Record<string, unknown>
        settings[String(row.key)] = row.value
      }
      return Response.json({ settings })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ settings: {} })
    }
  })
}

export async function PUT(req: Request) {
  return withSuperAdminAuth(req, 'system', 'manage_settings', async (viewer, req) => {
    let body: { settings?: Record<string, unknown> }
    try {
      body = (await req.json()) as { settings?: Record<string, unknown> }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const settings = body.settings ?? {}
    const sql = getSql()
    try {
      for (const [key, value] of Object.entries(settings)) {
        await sql`
          INSERT INTO platform_settings (key, value, updated_at)
          VALUES (${key}, ${JSON.stringify(value)}, now())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `
      }
      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'settings.update',
        entityType: 'platform_settings',
        newValue: settings,
        ...meta,
      })
      return Response.json({ ok: true })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Settings table not migrated' }, { status: 503 })
      }
      throw e
    }
  })
}
