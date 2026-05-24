import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'boreholes', 'read', async () => {
    const url = new URL(req.url)
    const district = url.searchParams.get('district')
    const region = url.searchParams.get('region')
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true'
    const limit = Number(url.searchParams.get('limit') ?? 100)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const sql = getSql()

    try {
      let rows: Record<string, unknown>[]
      if (includeDeleted) {
        rows = (await sql`
          SELECT b.id, b.borehole_id, b.functional_state, b.license_status,
                 d.name AS district, r.name AS region, b.deleted_at, b.created_at
          FROM boreholes b
          LEFT JOIN districts d ON d.id = b.district_id
          LEFT JOIN regions r ON r.id = b.region_id
          ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}
        `) as Record<string, unknown>[]
      } else {
        rows = (await sql`
          SELECT b.id, b.borehole_id, b.functional_state, b.license_status,
                 d.name AS district, r.name AS region, b.deleted_at, b.created_at
          FROM boreholes b
          LEFT JOIN districts d ON d.id = b.district_id
          LEFT JOIN regions r ON r.id = b.region_id
          WHERE b.deleted_at IS NULL
          ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}
        `) as Record<string, unknown>[]
      }
      let items = rows.map((r) => ({
        id: String(r.id),
        boreholeId: String(r.borehole_id),
        functionalState: r.functional_state != null ? String(r.functional_state) : null,
        licenseStatus: r.license_status != null ? String(r.license_status) : null,
        district: r.district != null ? String(r.district) : '',
        region: r.region != null ? String(r.region) : '',
        deletedAt: r.deleted_at ? new Date(String(r.deleted_at)).toISOString() : null,
        createdAt: new Date(String(r.created_at)).toISOString(),
      }))
      if (district) items = items.filter((i) => i.district === district)
      if (region) items = items.filter((i) => i.region === region)
      return Response.json({ items })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ items: [] })
    }
  })
}
