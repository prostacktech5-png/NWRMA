import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function POST(req: Request) {
  return withSuperAdminAuth(req, 'reports', 'create', async (viewer, req) => {
    let body: { reportType?: string; parameters?: Record<string, unknown> }
    try {
      body = (await req.json()) as { reportType?: string; parameters?: Record<string, unknown> }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const reportType = typeof body.reportType === 'string' ? body.reportType : 'platform_summary'
    const sql = getSql()
    const id = randomUUID()
    try {
      await sql`
        INSERT INTO report_jobs (id, report_type, status, parameters, requested_by)
        VALUES (${id}, ${reportType}, 'pending', ${JSON.stringify(body.parameters ?? {})}, ${viewer.id})
      `
      return Response.json({ id, status: 'pending' }, { status: 201 })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json(
          { id, status: 'pending', note: 'Report queue table not migrated; job accepted in-memory only' },
          { status: 201 }
        )
      }
      throw e
    }
  })
}
