import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'system', 'read', async () => {
    const url = new URL(req.url)
    const unresolvedOnly = url.searchParams.get('unresolved') !== 'false'
    const sql = getSql()
    try {
      const rows = unresolvedOnly
        ? await sql`
            SELECT * FROM validation_findings
            WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 200
          `
        : await sql`
            SELECT * FROM validation_findings ORDER BY created_at DESC LIMIT 200
          `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          entityType: String(row.entity_type),
          entityId: String(row.entity_id),
          rule: String(row.rule),
          severity: String(row.severity),
          score: row.score != null ? Number(row.score) : null,
          payload: row.payload,
          resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : null,
          createdAt: new Date(String(row.created_at)).toISOString(),
        }
      })
      return Response.json({ items })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ items: [] })
    }
  })
}
