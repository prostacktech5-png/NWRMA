import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'water_quality', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`
        SELECT * FROM water_quality_tests ORDER BY created_at DESC LIMIT 200
      `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          boreholeId: row.borehole_id != null ? String(row.borehole_id) : null,
          labReference: row.lab_reference != null ? String(row.lab_reference) : null,
          status: String(row.status),
          parameters: row.parameters,
          testedAt: row.tested_at ? new Date(String(row.tested_at)).toISOString() : null,
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

export async function POST(req: Request) {
  return withSuperAdminAuth(req, 'water_quality', 'create', async (viewer, req) => {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const sql = getSql()
    const id = randomUUID()
    try {
      await sql`
        INSERT INTO water_quality_tests (id, borehole_id, lab_reference, status, parameters, tested_at)
        VALUES (
          ${id},
          ${typeof body.boreholeId === 'string' ? body.boreholeId : null},
          ${typeof body.labReference === 'string' ? body.labReference : null},
          ${typeof body.status === 'string' ? body.status : 'pending'},
          ${JSON.stringify(body.parameters ?? {})},
          ${body.testedAt ? new Date(String(body.testedAt)) : null}
        )
      `
      return Response.json({ id }, { status: 201 })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Water quality tables not migrated' }, { status: 503 })
      }
      throw e
    }
  })
}
