import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'notifications', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`
        SELECT id, trigger_key, channel, subject, body, enabled, updated_at
        FROM notification_templates ORDER BY trigger_key, channel
      `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          triggerKey: String(row.trigger_key),
          channel: String(row.channel),
          subject: row.subject != null ? String(row.subject) : null,
          body: String(row.body),
          enabled: Boolean(row.enabled),
          updatedAt: new Date(String(row.updated_at)).toISOString(),
        }
      })
      return Response.json({ items })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ items: [] })
    }
  })
}
