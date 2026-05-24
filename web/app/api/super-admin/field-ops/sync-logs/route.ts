import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'field_ops', 'read', async () => {
    const sql = getSql()
    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 100)
    try {
      const rows = await sql`
        SELECT id, user_id, device_id, status, error_message, gps_lat, gps_lng, synced_at
        FROM field_sync_logs ORDER BY synced_at DESC LIMIT ${limit}
      `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          userId: row.user_id != null ? String(row.user_id) : null,
          deviceId: row.device_id != null ? String(row.device_id) : null,
          status: String(row.status),
          errorMessage: row.error_message != null ? String(row.error_message) : null,
          gpsLat: row.gps_lat != null ? Number(row.gps_lat) : null,
          gpsLng: row.gps_lng != null ? Number(row.gps_lng) : null,
          syncedAt: new Date(String(row.synced_at)).toISOString(),
        }
      })
      return Response.json({ items })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ items: [] })
    }
  })
}
