import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'gis', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`
        SELECT id, borehole_id, latitude, longitude, functional_state, license_status
        FROM boreholes
        WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
        LIMIT 5000
      `
      const points = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          boreholeId: String(row.borehole_id),
          lat: Number(row.latitude),
          lng: Number(row.longitude),
          functionalState: row.functional_state != null ? String(row.functional_state) : null,
          licenseStatus: row.license_status != null ? String(row.license_status) : null,
        }
      })
      return Response.json({ points })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ points: [] })
    }
  })
}
